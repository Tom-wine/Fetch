'use client'

import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError, type ApiResult } from '../client'
import {
  accountsApi,
  fixturesApi,
  listingsApi,
  ticketsApi,
  type ListingFilters,
  type TicketFilters,
} from '../endpoints'
import type { Account, Listing, Ticket } from '@/lib/types'
import { qk } from './keys'
import { useOptimisticMutation } from './useOptimisticMutation'
import { toTableState, type TableState } from './useAccounts'

/**
 * The data layer for §8.5, `/mytickets/fixture/[id]`.
 *
 * Everything the screen needs that `useFixtures.ts` does not already provide lives
 * here. `useFixture`, `useFixtureTickets`, `useTicketAction` and `useDeleteTickets`
 * are imported by the screen straight from `useFixtures.ts` rather than re-exported,
 * so there is one definition of each and no wrapper to keep in step.
 *
 * No key namespace was added: `qk.fixtures.tickets(id, filters)` already exists, and
 * the comparables panel reads through `qk.listings.list`.
 */

/* ------------------------------------------------------------- the rows */

/**
 * The seat table. Same query as `useFixtureTickets`, plus the envelope's paging meta,
 * which DataTable's manual mode needs and `TableState` deliberately does not carry.
 */
export interface TicketPageState extends TableState<Ticket> {
  page: number
  pageSize: number
  totalPages: number
}

export function useFixtureTicketsPage(
  fixtureId: string | null,
  filters: TicketFilters = {},
): TicketPageState {
  const query = useQuery<ApiResult<Ticket[]>, ApiError>({
    queryKey: qk.fixtures.tickets(fixtureId ?? '', filters),
    queryFn: () => fixturesApi.tickets(fixtureId!, filters),
    enabled: Boolean(fixtureId),
    // Keeps the rows on screen while the next page loads, so paging does not flash
    // the skeleton and the panel does not lose the selection it is describing.
    placeholderData: (previous) => previous,
  })

  const meta = query.data?.meta ?? null

  return {
    ...toTableState(query),
    page: meta?.page ?? Number(filters.page ?? 1),
    pageSize: meta?.pageSize ?? Number(filters.pageSize ?? 25),
    totalPages: meta?.totalPages ?? 1,
  }
}

/* ----------------------------------------------------------- the facets */

/**
 * `All accounts`, `All blocks` and `All rows` offer only what THIS fixture actually
 * holds, so every option returns rows. That needs the fixture's whole ticket set
 * rather than the loaded page — 200 is the API's own pageSize ceiling (§6.2), and no
 * fixture in the seed comes close, so it is one request.
 *
 * It is deliberately unfiltered: an option list that narrows as you use it cannot be
 * used to widen a selection again.
 */
export interface FixtureFacets {
  tickets: Ticket[]
  blocks: string[]
  rows: string[]
  accountIds: string[]
  loading: boolean
}

const FACET_FILTERS: TicketFilters = { page: 1, pageSize: 200, sort: 'block', order: 'asc' }

export function useFixtureFacets(fixtureId: string | null): FixtureFacets {
  const query = useQuery<ApiResult<Ticket[]>, ApiError>({
    queryKey: qk.fixtures.tickets(fixtureId ?? '', FACET_FILTERS),
    queryFn: () => fixturesApi.tickets(fixtureId!, FACET_FILTERS),
    enabled: Boolean(fixtureId),
  })

  const tickets = React.useMemo(() => query.data?.data ?? [], [query.data])
  const pending = query.isPending

  return React.useMemo(
    () => ({
      tickets,
      blocks: unique(tickets.map((t) => t.block)).sort((a, b) => a.localeCompare(b, 'en')),
      // Seat rows are numeric strings in the seed; sorting them as text would put
      // row 10 before row 2.
      rows: unique(tickets.map((t) => t.row)).sort(byNumberThenText),
      accountIds: unique(tickets.map((t) => t.accountId)),
      loading: pending,
    }),
    [tickets, pending],
  )
}

/* --------------------------------------------------------- the accounts */

/**
 * The ACCOUNT column shows an email, but a ticket carries only an `accountId`. One
 * request for the account book — 64 rows in the seed, well inside the ceiling — beats
 * one `useAccount` per row, which would be a request per seat on every page change.
 */
export function useAccountBook(): { byId: Map<string, Account>; loading: boolean } {
  const filters = React.useMemo(() => ({ page: 1, pageSize: 200 }), [])

  const query = useQuery<ApiResult<Account[]>, ApiError>({
    queryKey: qk.accounts.list(filters),
    queryFn: () => accountsApi.list(filters),
    staleTime: 60_000,
  })

  const byId = React.useMemo(
    () => new Map((query.data?.data ?? []).map((account) => [account.id, account])),
    [query.data],
  )

  return { byId, loading: query.isPending }
}

/* ------------------------------------------------------------ mutations */

/**
 * The VISIBILITY eye.
 *
 * `POST /tickets/share` is the only write that touches `visibility`, and it only ever
 * sets it to `visible` — there is no `PATCH /tickets/:id`, so a seat cannot be hidden
 * again through the API (ASK 1 in fetch-sync.md). The hook therefore exposes exactly
 * the direction the server can honour; the cell renders the other one as an indicator
 * rather than as a button that would lie.
 */
export function useRevealTickets() {
  return useOptimisticMutation<
    { ids: string[] },
    ApiResult<{ tickets: Ticket[]; listings: Listing[] }>
  >({
    mutationFn: ({ ids }) => ticketsApi.action('share', { ids }),
    keys: () => [qk.fixtures.all],
    optimistic: (previous, { ids }) => patchTickets(previous, ids, { visibility: 'visible' }),
    successMessage: (_result, { ids }) =>
      ids.length === 1
        ? 'The seat is now visible to buyers.'
        : `${ids.length} seats are now visible to buyers.`,
  })
}

/**
 * `Reset PW` and `Relogin` in the toolbar. Both act on the ACCOUNTS behind the
 * selected seats, not on the seats — one request per distinct account, one toast for
 * the lot, because "4 tickets selected" is usually two or three logins.
 *
 * `POST /accounts/:id/:action` takes one id at a time and there is no bulk route, so
 * the fan-out is here rather than pretended away.
 */
export function useAccountMaintenance() {
  return useOptimisticMutation<{ ids: string[]; action: 'relogin' | 'reset-password' }, Account[]>({
    mutationFn: async ({ ids, action }) => {
      const results = await Promise.all(ids.map((id) => accountsApi.action(id, action)))
      return results.map((result) => result.data)
    },
    keys: () => [qk.accounts.all],
    successMessage: (accounts, { action }) => {
      const n = accounts.length
      const noun = n === 1 ? 'account' : 'accounts'
      return action === 'reset-password'
        ? `Password reset on ${n} ${noun}. The club emails the new one.`
        : `${n} ${noun} signed back in.`
    },
  })
}

/**
 * `Refresh`. There is no refresh endpoint — refreshing an inventory means asking the
 * API again — so this invalidates and says exactly that, rather than implying the
 * club session was re-scraped.
 */
export function useRefreshTickets() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries({ queryKey: qk.fixtures.all })
      toast.success('Seats re-checked.')
    } catch {
      toast.error('The seats could not be refreshed. Try again in a moment.')
    } finally {
      setRefreshing(false)
    }
  }, [queryClient])

  return { refresh, refreshing }
}

/* ---------------------------------------------------------- comparables */

/**
 * The `Fixture Info` tab's comparable-sales lookup.
 *
 * There is no comparables endpoint, and inventing one would mean inventing the
 * numbers with it. These are the REAL listings on this fixture: `Live prices` is what
 * is buyable right now, `Recent sales` is what has already gone. Both come from
 * `GET /listings?fixtureId=...`, so every figure on the tab is one an operator can go
 * and check.
 *
 * The query is `null` until the search button is pressed: the tab opens on an empty
 * state and fetches only when asked, because a lookup that runs itself is a lookup
 * nobody trusts.
 */
export interface ComparablesQuery {
  fixtureId: string
  /** A block name, or null for every block. */
  block: string | null
  /** Minimum quantity a listing must offer. */
  qty: number
}

export interface Comparables {
  live: Listing[]
  sold: Listing[]
  loading: boolean
  error: string | null
  onRetry: () => void
}

function comparableFilters(fixtureId: string): ListingFilters {
  return { fixtureId: [fixtureId], page: 1, pageSize: 200, sort: 'price', order: 'asc' }
}

export function useComparables(params: ComparablesQuery | null): Comparables {
  const fixtureId = params?.fixtureId ?? null
  const block = params?.block ?? null
  const qty = params?.qty ?? 1

  const filters = React.useMemo(
    () => (fixtureId ? comparableFilters(fixtureId) : null),
    [fixtureId],
  )

  const query = useQuery<ApiResult<Listing[]>, ApiError>({
    queryKey: qk.listings.list(filters ?? {}),
    queryFn: () => listingsApi.list(filters!),
    enabled: Boolean(filters),
  })

  const all = query.data?.data
  const pending = query.isPending
  const error = query.error
  const refetch = query.refetch

  return React.useMemo(() => {
    // Block and quantity are narrowed here rather than on the wire: `GET /listings`
    // filters by platform, account, status and fixture, and has no `block` key.
    const matching = (all ?? []).filter(
      (listing) => (!block || listing.block === block) && listing.quantity >= qty,
    )

    return {
      live: matching
        .filter((l) => l.status === 'ACTIVE' || l.status === 'PAUSED')
        .sort((a, b) => a.price - b.price),
      sold: matching
        .filter((l) => l.status === 'SOLDOUT')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      loading: Boolean(filters) && pending,
      error: error ? error.message : null,
      onRetry: () => void refetch(),
    }
  }, [all, block, qty, filters, pending, error, refetch])
}

/* ------------------------------------------------------------ internals */

/** `patchInList` for a SET of ids — the eye acts on a selection, not on one row. */
function patchTickets(previous: unknown, ids: string[], patch: Partial<Ticket>): unknown {
  if (!previous || typeof previous !== 'object') return previous
  const page = previous as { data?: unknown }
  if (!Array.isArray(page.data)) return previous
  const set = new Set(ids)
  return {
    ...page,
    data: (page.data as Ticket[]).map((ticket) =>
      set.has(ticket.id) ? { ...ticket, ...patch } : ticket,
    ),
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function byNumberThenText(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.localeCompare(b, 'en')
}
