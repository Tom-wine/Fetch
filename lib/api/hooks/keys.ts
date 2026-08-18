import type {
  AccountFilters,
  FixtureFilters,
  ListParams,
  ListingFilters,
  ProxyFilters,
  TicketFilters,
} from '../endpoints'

/**
 * The query-key factory. Every key in the app comes from here, so an invalidation
 * can target exactly one list or every list of a resource without anyone
 * hand-assembling an array and getting the order wrong.
 *
 *   qk.accounts.all            → ['accounts']            invalidates every accounts query
 *   qk.accounts.list(filters)  → ['accounts','list',{…}] one filtered page
 *   qk.accounts.detail(id)     → ['accounts','detail',id]
 */
export const qk = {
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...qk.accounts.all, 'list'] as const,
    list: (filters: AccountFilters) => [...qk.accounts.lists(), filters] as const,
    detail: (id: string) => [...qk.accounts.all, 'detail', id] as const,
    stats: () => [...qk.accounts.all, 'stats'] as const,
    /**
     * Every row matching a filter set, not just the current page — the set behind
     * the /accounts bulk-selection escalation ("select all 64 matching these
     * filters"). Separate from `list` because it is deliberately unpaged.
     */
    matching: (filters: AccountFilters) => [...qk.accounts.all, 'matching', filters] as const,
  },
  clubs: {
    all: ['clubs'] as const,
    list: () => [...qk.clubs.all, 'list'] as const,
  },
  fixtures: {
    all: ['fixtures'] as const,
    lists: () => [...qk.fixtures.all, 'list'] as const,
    list: (filters: FixtureFilters) => [...qk.fixtures.lists(), filters] as const,
    detail: (id: string) => [...qk.fixtures.all, 'detail', id] as const,
    tickets: (id: string, filters: TicketFilters) =>
      [...qk.fixtures.all, 'detail', id, 'tickets', filters] as const,
  },
  listings: {
    all: ['listings'] as const,
    lists: () => [...qk.listings.all, 'list'] as const,
    list: (filters: ListingFilters) => [...qk.listings.lists(), filters] as const,
  },
  proxies: {
    all: ['proxies'] as const,
    lists: () => [...qk.proxies.all, 'list'] as const,
    list: (filters: ProxyFilters) => [...qk.proxies.lists(), filters] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpis: () => [...qk.dashboard.all, 'kpis'] as const,
    revenue: (groupBy: string) => [...qk.dashboard.all, 'revenue', groupBy] as const,
    activity: (filters: ListParams) => [...qk.dashboard.all, 'activity', filters] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: ListParams) => [...qk.notifications.all, 'list', filters] as const,
  },
  search: {
    all: ['search'] as const,
    query: (q: string) => [...qk.search.all, q] as const,
  },
} as const
