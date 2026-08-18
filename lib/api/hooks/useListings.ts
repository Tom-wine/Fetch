'use client'

import { useQuery } from '@tanstack/react-query'
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

export function useListingsTable(filters: ListingFilters = {}): TableState<Listing> {
  return toTableState(useListings(filters))
}

/**
 * The §8.6 inline price edit — the canonical optimistic mutation.
 *
 * The new price appears in the cell the instant Enter is pressed, a toast confirms,
 * and if the server rejects it the snapshot is restored so the old price comes back
 * visibly rather than the row quietly keeping a value the server never accepted.
 */
export function useUpdateListing() {
  return useOptimisticMutation<
    { id: string; patch: ListingPatch; forceFailure?: boolean },
    ApiResult<Listing>
  >({
    mutationFn: ({ id, patch, forceFailure }) =>
      listingsApi.patch(id, patch, forceFailure ? { __fail: 500 } : undefined),
    keys: () => [qk.listings.all],
    optimistic: (previous, { id, patch }) => patchInList<Listing>(previous, id, patch),
    successMessage: (_result, { patch }) =>
      patch.price !== undefined ? 'Price updated.' : 'Listing updated.',
    errorMessage: (error) => (error.isTransient ? 'Could not save that price.' : error.message),
  })
}

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
