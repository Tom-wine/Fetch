'use client'

import * as React from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { ApiError, type ApiResult } from '../client'
import { listingsApi, type ListingFilters } from '../endpoints'
import type { ListingBulk, ListingPatch } from '../schemas'
import type { Listing } from '@/lib/types'
import { qk } from './keys'
import { patchInList, removeFromList, useOptimisticMutation } from './useOptimisticMutation'
import { toTableState, type TableState } from './useAccounts'

export function useListings(filters: ListingFilters = {}) {
  return useQuery<ApiResult<Listing[]>, ApiError>({
    queryKey: qk.listings.list(filters),
    queryFn: () => listingsApi.list(filters),
    placeholderData: (previous) => previous,
  })
}

/**
 * The same query pre-mapped onto DataTable's prop shape, with the raw query kept
 * alongside so the screen can read `meta.totalPages` for server-driven pagination.
 */
export function useListingsTable(filters: ListingFilters = {}): TableState<Listing> & {
  query: UseQueryResult<ApiResult<Listing[]>, ApiError>
} {
  const query = useListings(filters)
  return { ...toTableState(query), query }
}

/** The list endpoint's own ceiling (`lib/mock/http.ts#listQuery`). */
const MAX_PAGE_SIZE = 200

/**
 * Every listing matching a filter set, not just the page on screen — the set behind
 * the bulk-selection escalation ("select all 26 matching these filters") and behind
 * a reprice that has to preview prices it cannot see.
 *
 * Deliberately not a hook and not cached: it is fetched at the moment the operator
 * asks for it, so the number in the label is the number that gets acted on.
 */
export async function fetchAllMatchingListings(filters: ListingFilters): Promise<Listing[]> {
  const base: ListingFilters = { ...filters, page: 1, pageSize: MAX_PAGE_SIZE }
  const first = await listingsApi.list(base)
  const rows = [...first.data]
  const totalPages = first.meta?.totalPages ?? 1

  for (let page = 2; page <= totalPages; page++) {
    const next = await listingsApi.list({ ...base, page })
    rows.push(...next.data)
  }

  return rows
}

/* ------------------------------------------------------------- mutations */

/**
 * §6.2 failure injection, threaded through the writes rather than only the reads.
 *
 * `?__fail=500` on /mylistings is forwarded to the PATCH so the optimistic rollback
 * can be demonstrated on the real screen — the price appears, the server refuses it,
 * and the old value comes back with an error toast. A real backend ignores it.
 */
function failQuery(fail: number | null | undefined) {
  return fail ? { __fail: fail } : undefined
}

export interface ListingUpdate {
  id: string
  patch: ListingPatch
  /** Forwarded as `?__fail=` so a forced failure exercises the rollback. */
  fail?: number | null
  /** Boolean shorthand for `fail: 500`, used by the kitchen sink's failure switch. */
  forceFailure?: boolean
  /**
   * The value to put back if the operator hits Undo — supplied by the caller,
   * because only the cell knows what was on screen before it was edited.
   */
  undo?: ListingPatch
  /** Set on the write Undo itself issues, so it toasts once and does not recurse. */
  isUndo?: boolean
}

/**
 * The §8.6 inline price edit — the canonical optimistic mutation.
 *
 * The new price appears in the cell the instant Enter is pressed, a toast confirms
 * with an Undo, and if the server rejects it the snapshot is restored so the old
 * price comes back visibly rather than the row quietly keeping a value the server
 * never accepted.
 *
 * Undo is a second write rather than a cache poke: the first one succeeded, so the
 * server holds the new price and only another PATCH can take it back. It reuses this
 * same mutation — hence the ref, which is how the options object reaches a mutation
 * that does not exist yet when it is built. `isUndo` keeps it silent so an undo
 * cannot offer an undo of its own.
 */
export function useUpdateListing() {
  const self = React.useRef<{ mutate: (v: ListingUpdate) => void } | null>(null)

  const mutation = useOptimisticMutation<ListingUpdate, ApiResult<Listing>>({
    mutationFn: ({ id, patch, fail, forceFailure }) =>
      listingsApi.patch(id, patch, failQuery(fail ?? (forceFailure ? 500 : null))),
    keys: () => [qk.listings.all],
    optimistic: (previous, { id, patch }) => patchInList<Listing>(previous, id, patch),
    successMessage: (_result, { patch, isUndo }) =>
      isUndo ? null : patch.price !== undefined ? 'Price updated.' : 'Listing updated.',
    errorMessage: (error) => (error.isTransient ? 'Could not save that price.' : error.message),
    undo: (_result, variables) => {
      if (!variables.undo) return
      self.current?.mutate({
        id: variables.id,
        patch: variables.undo,
        fail: variables.fail,
        forceFailure: variables.forceFailure,
        isUndo: true,
      })
    },
  })

  self.current = mutation
  return mutation
}

export interface ListingReprice {
  /** One resulting price per listing — the API takes a single price per call. */
  changes: Array<{ id: string; price: number }>
  fail?: number | null
}

/**
 * Bulk reprice. `POST /listings/bulk` carries ONE price for the whole set, which
 * covers "set every listing to £X" and nothing else — a percentage or a fixed
 * adjustment gives each listing a different result. So the adjustment is computed
 * client-side (that is what the dialog previews) and committed as one PATCH per
 * listing, wrapped in a single optimistic update and a single toast.
 */
export function useRepriceListings() {
  return useOptimisticMutation<ListingReprice, { affected: number }>({
    mutationFn: async ({ changes, fail }) => {
      const results = await Promise.all(
        changes.map((change) =>
          listingsApi.patch(change.id, { price: change.price }, failQuery(fail)),
        ),
      )
      return { affected: results.length }
    },
    keys: () => [qk.listings.all],
    optimistic: (previous, { changes }) =>
      changes.reduce<unknown>(
        (acc, change) => patchInList<Listing>(acc, change.id, { price: change.price }),
        previous,
      ),
    successMessage: (result) =>
      `${result.affected} ${result.affected === 1 ? 'listing' : 'listings'} repriced.`,
    errorMessage: (error) =>
      error.isTransient ? 'The reprice did not go through. Nothing was changed.' : error.message,
  })
}

/**
 * Activate / deactivate / delete. No `fail` here on purpose: `POST /listings/bulk`
 * takes no query string through `listingsApi.bulk`, so accepting a parameter it
 * cannot forward would be a switch that silently does nothing.
 */
export function useBulkListings() {
  return useOptimisticMutation<ListingBulk, ApiResult<{ affected: number; listings: Listing[] }>>({
    mutationFn: (body) => listingsApi.bulk(body),
    keys: () => [qk.listings.all],
    optimistic: (previous, body) => {
      if (body.action === 'delete') return removeFromList<Listing>(previous, body.ids)
      const patch: Partial<Listing> =
        body.action === 'activate'
          ? { status: 'ACTIVE' }
          : body.action === 'deactivate'
            ? { status: 'INACTIVE' }
            : body.price !== undefined
              ? { price: body.price }
              : {}
      return body.ids.reduce((acc, id) => patchInList<Listing>(acc, id, patch), previous)
    },
    successMessage: (result, body) =>
      `${body.action === 'delete' ? 'Deleted' : 'Updated'} ${result.data.affected} ${
        result.data.affected === 1 ? 'listing' : 'listings'
      }.`,
  })
}
