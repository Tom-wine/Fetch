'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { ApiError, type ApiResult } from '../client'
import { accountsApi, type AccountFilters } from '../endpoints'
import type { AccountCreate, AccountPatch } from '../schemas'
import type { Account, AccountStats } from '@/lib/types'
import { qk } from './keys'
import { patchInList, removeFromList, useOptimisticMutation } from './useOptimisticMutation'

/**
 * The shape DataTable already expects (Part 2): `loading`, `error: string | null`,
 * `onRetry`. `toTableState` maps a query result onto it so no screen invents a
 * second loading convention.
 */
export interface TableState<T> {
  rows: T[]
  total: number
  loading: boolean
  error: string | null
  onRetry: () => void
  /** Present so a screen can distinguish a background refetch from a cold load. */
  fetching: boolean
}

export function toTableState<T>(query: UseQueryResult<ApiResult<T[]>, ApiError>): TableState<T> {
  return {
    rows: query.data?.data ?? [],
    total: query.data?.meta?.total ?? query.data?.data.length ?? 0,
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    onRetry: () => void query.refetch(),
    fetching: query.isFetching,
  }
}

export function useAccounts(filters: AccountFilters = {}) {
  return useQuery<ApiResult<Account[]>, ApiError>({
    queryKey: qk.accounts.list(filters),
    queryFn: () => accountsApi.list(filters),
    // Keeps the previous page on screen while the next one loads, so paging does not
    // flash the skeleton.
    placeholderData: (previous) => previous,
  })
}

/** Same query, pre-mapped onto the DataTable prop shape. */
export function useAccountsTable(filters: AccountFilters = {}): TableState<Account> & {
  query: UseQueryResult<ApiResult<Account[]>, ApiError>
} {
  const query = useAccounts(filters)
  return { ...toTableState(query), query }
}

export function useAccount(id: string | null) {
  return useQuery<ApiResult<Account>, ApiError>({
    queryKey: qk.accounts.detail(id ?? ''),
    queryFn: () => accountsApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useAccountStats() {
  return useQuery<ApiResult<AccountStats>, ApiError>({
    queryKey: qk.accounts.stats(),
    queryFn: () => accountsApi.stats(),
  })
}

/* ------------------------------------------------------------- mutations */

export function useCreateAccount() {
  return useOptimisticMutation<AccountCreate, ApiResult<Account>>({
    mutationFn: (body) => accountsApi.create(body),
    keys: () => [qk.accounts.all],
    successMessage: (result) => `${result.data.email} added.`,
  })
}

export function useUpdateAccount() {
  return useOptimisticMutation<{ id: string; patch: AccountPatch }, ApiResult<Account>>({
    mutationFn: ({ id, patch }) => accountsApi.patch(id, patch),
    keys: () => [qk.accounts.all],
    optimistic: (previous, { id, patch }) =>
      patchInList<Account>(previous, id, patch as Partial<Account>),
    successMessage: () => 'Account updated.',
  })
}

export function useDeleteAccounts() {
  return useOptimisticMutation<{ ids: string[] }, ApiResult<{ affected: number; ids: string[] }>>({
    mutationFn: ({ ids }) => accountsApi.remove(ids),
    keys: () => [qk.accounts.all],
    optimistic: (previous, { ids }) => removeFromList<Account>(previous, ids),
    successMessage: (_result, { ids }) =>
      `${ids.length} ${ids.length === 1 ? 'account' : 'accounts'} deleted.`,
  })
}

/** `login` / `relogin` / `reset-password` — the §8.2 row actions. */
export function useAccountAction() {
  return useOptimisticMutation<
    { id: string; action: 'login' | 'relogin' | 'reset-password' },
    ApiResult<Account>
  >({
    mutationFn: ({ id, action }) => accountsApi.action(id, action),
    keys: () => [qk.accounts.all],
    successMessage: (result, { action }) =>
      action === 'reset-password'
        ? `Password reset for ${result.data.email}.`
        : `${result.data.email} signed in.`,
  })
}

/**
 * Backs PasswordCell's `onReveal`. Deliberately NOT a TanStack mutation with a
 * cache: a revealed password must never be written into the query cache, where it
 * would sit in memory long after the cell re-masked. It is a bare call whose result
 * lives only in the cell's own state for ten seconds.
 */
export function useRevealPassword() {
  return (id: string) => async () => {
    const result = await accountsApi.reveal(id)
    return result.data.password
  }
}
