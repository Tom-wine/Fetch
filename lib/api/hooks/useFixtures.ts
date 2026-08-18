'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, type ApiResult } from '../client'
import { fixturesApi, ticketsApi, type FixtureFilters, type TicketFilters } from '../endpoints'
import type { Fixture, Listing, Platform, Ticket } from '@/lib/types'
import { qk } from './keys'
import { removeFromList, useOptimisticMutation } from './useOptimisticMutation'
import { toTableState, type TableState } from './useAccounts'

export function useFixtures(filters: FixtureFilters = {}) {
  return useQuery<ApiResult<Fixture[]>, ApiError>({
    queryKey: qk.fixtures.list(filters),
    queryFn: () => fixturesApi.list(filters),
    placeholderData: (previous) => previous,
  })
}

export function useFixturesTable(filters: FixtureFilters = {}): TableState<Fixture> {
  return toTableState(useFixtures(filters))
}

/**
 * The /mytickets list (§8.4). Same query as `useFixturesTable`, but it also hands
 * back the envelope's paging meta, because DataTable's server-driven mode needs
 * `pageCount` / `totalRows` / `page` and `TableState` deliberately does not carry
 * them.
 *
 * `fetching` is separate from `loading` on purpose: the screen skeletons a cold load
 * but only dims on a refetch, so pressing Refresh does not blank the inventory.
 */
export interface FixturePageState extends TableState<Fixture> {
  page: number
  pageSize: number
  totalPages: number
}

export function useFixturesPage(filters: FixtureFilters = {}): FixturePageState {
  const query = useFixtures(filters)
  const meta = query.data?.meta ?? null

  return {
    ...toTableState(query),
    page: meta?.page ?? Number(filters.page ?? 1),
    pageSize: meta?.pageSize ?? Number(filters.pageSize ?? 25),
    totalPages: meta?.totalPages ?? 1,
  }
}

/**
 * The `Refresh` button, and the per-provider `Refresh all` inside the filters
 * popover. There is no refresh *endpoint* — refreshing an inventory means asking the
 * API again — so this invalidates every fixtures query and says so honestly rather
 * than implying that club sessions were re-scraped.
 */
export function useRefreshFixtures() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = React.useCallback(
    async (label?: string) => {
      setRefreshing(true)
      try {
        await queryClient.invalidateQueries({ queryKey: qk.fixtures.all })
        toast.success(label ? `${label} re-checked.` : 'Inventory re-checked.')
      } catch {
        toast.error('The inventory could not be refreshed. Try again in a moment.')
      } finally {
        setRefreshing(false)
      }
    },
    [queryClient],
  )

  return { refresh, refreshing }
}

/**
 * Fetches every fixture matching the current filters — not just the page on screen —
 * so an export is the whole filtered set. Goes through the Query cache, so an export
 * straight after a page load is free.
 */
export function useAllFixtures() {
  const queryClient = useQueryClient()

  return React.useCallback(
    async (filters: FixtureFilters = {}): Promise<Fixture[]> => {
      // 200 is the API's own pageSize ceiling (§6.2), so this is one request.
      const query: FixtureFilters = { ...filters, page: 1, pageSize: 200 }
      const result = await queryClient.fetchQuery<ApiResult<Fixture[]>, ApiError>({
        queryKey: qk.fixtures.list(query),
        queryFn: () => fixturesApi.list(query),
      })
      return result.data
    },
    [queryClient],
  )
}

export function useFixture(id: string | null) {
  return useQuery<ApiResult<Fixture>, ApiError>({
    queryKey: qk.fixtures.detail(id ?? ''),
    queryFn: () => fixturesApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useFixtureTickets(id: string | null, filters: TicketFilters = {}) {
  return useQuery<ApiResult<Ticket[]>, ApiError>({
    queryKey: qk.fixtures.tickets(id ?? '', filters),
    queryFn: () => fixturesApi.tickets(id!, filters),
    enabled: Boolean(id),
    placeholderData: (previous) => previous,
  })
}

export function useFixtureTicketsTable(
  id: string | null,
  filters: TicketFilters = {},
): TableState<Ticket> {
  return toTableState(useFixtureTickets(id, filters))
}

/* ------------------------------------------------------- ticket actions */

export function useTicketAction() {
  return useOptimisticMutation<
    {
      action: 'group' | 'list' | 'transfer' | 'share'
      ids: string[]
      platform?: Platform
      price?: number
    },
    ApiResult<{ tickets: Ticket[]; listings: Listing[] }>
  >({
    mutationFn: ({ action, ...body }) => ticketsApi.action(action, body),
    // A ticket action can create listings and shift fixture counts, so both
    // resources are invalidated rather than just the tickets list.
    keys: () => [qk.fixtures.all, qk.listings.all],
    successMessage: (result, { action, ids }) => {
      const n = ids.length
      const noun = n === 1 ? 'ticket' : 'tickets'
      if (action === 'list') return `${n} ${noun} listed on the marketplace.`
      if (action === 'group') return `${n} ${noun} grouped.`
      if (action === 'transfer') return `${n} ${noun} transferred.`
      return `${n} ${noun} shared.`
    },
  })
}

export function useDeleteTickets() {
  return useOptimisticMutation<{ ids: string[] }, ApiResult<{ affected: number; ids: string[] }>>({
    mutationFn: ({ ids }) => ticketsApi.remove(ids),
    keys: () => [qk.fixtures.all],
    optimistic: (previous, { ids }) => removeFromList<Ticket>(previous, ids),
    successMessage: (_result, { ids }) =>
      `${ids.length} ${ids.length === 1 ? 'ticket' : 'tickets'} deleted.`,
  })
}
