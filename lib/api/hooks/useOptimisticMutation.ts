'use client'

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '../client'

/**
 * §6.4 — every mutation behaves identically:
 *
 *   cancel in-flight queries → snapshot the cache → apply the optimistic update
 *   → on success, toast and settle → on failure, roll the snapshot back and toast the error
 *
 * Writing it once means a screen cannot accidentally ship a mutation that skips the
 * rollback and leaves the table showing a value the server rejected.
 */

export interface OptimisticMutationOptions<TVariables, TResult> {
  /** Performs the write. */
  mutationFn: (variables: TVariables) => Promise<TResult>

  /**
   * Every key touched by this mutation. They are cancelled and snapshotted before
   * the optimistic update, and invalidated once the dust settles.
   */
  keys: (variables: TVariables) => QueryKey[]

  /**
   * Applies the optimistic change to one cached value. Called for every query that
   * matches `keys`. Return the value unchanged to leave a cache entry alone.
   */
  optimistic?: (previous: unknown, variables: TVariables) => unknown

  /** Success toast. Return null for a mutation that should stay silent. */
  successMessage?: (result: TResult, variables: TVariables) => string | null

  /** Overrides the default error toast text. */
  errorMessage?: (error: ApiError, variables: TVariables) => string

  /** Runs after a successful write, before invalidation. */
  onSuccess?: (result: TResult, variables: TVariables) => void

  /** An action the toast offers to undo the change. */
  undo?: (result: TResult, variables: TVariables) => void
}

interface Snapshot {
  key: QueryKey
  value: unknown
}

export function useOptimisticMutation<TVariables, TResult>(
  options: OptimisticMutationOptions<TVariables, TResult>,
): UseMutationResult<TResult, ApiError, TVariables, Snapshot[]> {
  const queryClient = useQueryClient()

  return useMutation<TResult, ApiError, TVariables, Snapshot[]>({
    mutationFn: options.mutationFn,

    onMutate: async (variables) => {
      const keys = options.keys(variables)

      // Cancel first: an in-flight refetch that resolves after the optimistic write
      // would overwrite it with stale data.
      await Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const snapshots: Snapshot[] = []
      for (const key of keys) {
        for (const [matchedKey, value] of queryClient.getQueriesData({ queryKey: key })) {
          snapshots.push({ key: matchedKey, value })
          if (options.optimistic) {
            queryClient.setQueryData(matchedKey, options.optimistic(value, variables))
          }
        }
      }

      return snapshots
    },

    onError: (error, variables, snapshots) => {
      // Roll back to exactly what was there before, entry by entry.
      for (const snapshot of snapshots ?? []) {
        queryClient.setQueryData(snapshot.key, snapshot.value)
      }

      const message = options.errorMessage?.(error, variables) ?? error.message
      toast.error(message, {
        description: error.isTransient ? 'Nothing was changed. Try again.' : undefined,
      })
    },

    onSuccess: (result, variables) => {
      options.onSuccess?.(result, variables)

      const message = options.successMessage?.(result, variables)
      if (message) {
        toast.success(message, {
          action: options.undo
            ? { label: 'Undo', onClick: () => options.undo!(result, variables) }
            : undefined,
        })
      }
    },

    onSettled: (_result, _error, variables) => {
      // Refetch whether it worked or not: on success to pick up server-derived
      // fields, on failure to be certain the rollback matches the server.
      for (const key of options.keys(variables)) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/** Helper for the common "replace one item inside a cached list" optimistic shape. */
export function patchInList<T extends { id: string }>(
  previous: unknown,
  id: string,
  patch: Partial<T>,
): unknown {
  if (!previous || typeof previous !== 'object') return previous
  const page = previous as { data?: unknown }
  if (!Array.isArray(page.data)) return previous
  return {
    ...page,
    data: (page.data as T[]).map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }
}

/** Helper for the common "drop these ids from a cached list" optimistic shape. */
export function removeFromList<T extends { id: string }>(
  previous: unknown,
  ids: string[],
): unknown {
  if (!previous || typeof previous !== 'object') return previous
  const page = previous as { data?: unknown; meta?: { total?: number } | null }
  if (!Array.isArray(page.data)) return previous
  const set = new Set(ids)
  const data = (page.data as T[]).filter((item) => !set.has(item.id))
  return {
    ...page,
    data,
    meta: page.meta
      ? { ...page.meta, total: Math.max(0, (page.meta.total ?? 0) - ids.length) }
      : page.meta,
  }
}
