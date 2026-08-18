'use client'

import { useQuery } from '@tanstack/react-query'
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
