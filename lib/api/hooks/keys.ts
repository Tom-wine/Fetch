import type {
  AccountFilters,
  FixtureFilters,
  ListParams,
  ProxyFilters,
  RunFilters,
  TaskFilters,
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
    stats: (fail?: number | null) => [...qk.accounts.all, 'stats', fail ?? null] as const,
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
    seatmap: (id: string) => [...qk.fixtures.all, 'detail', id, 'seatmap'] as const,
  },
  proxies: {
    all: ['proxies'] as const,
    lists: () => [...qk.proxies.all, 'list'] as const,
    list: (filters: ProxyFilters) => [...qk.proxies.lists(), filters] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    // `fail` is part of the key on purpose: without it a forced failure would be
    // answered from the cached good response and the error state would never render.
    kpis: (fail?: number | null) => [...qk.dashboard.all, 'kpis', fail ?? null] as const,
    revenue: (groupBy: string, fail?: number | null) =>
      [...qk.dashboard.all, 'revenue', groupBy, fail ?? null] as const,
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
  ballots: {
    all: ['ballots'] as const,
    /** The last-result-per-account join behind the pool table's two extra columns. */
    accountResults: () => ['ballots', 'account-results'] as const,
    imap: () => ['ballots', 'imap'] as const,
    profiles: {
      all: ['ballots', 'profiles'] as const,
      list: (filters: ListParams) => [...qk.ballots.profiles.all, 'list', filters] as const,
    },
    runs: {
      all: ['ballots', 'runs'] as const,
      lists: () => [...qk.ballots.runs.all, 'list'] as const,
      list: (filters: RunFilters) => [...qk.ballots.runs.lists(), filters] as const,
      detail: (id: string) => [...qk.ballots.runs.all, 'detail', id] as const,
      tasks: (id: string, filters: TaskFilters) =>
        [...qk.ballots.runs.all, 'detail', id, 'tasks', filters] as const,
      /**
       * Deliberately NOT keyed by cursor. The feed is append-only, so its cache entry
       * is the accumulated list and each poll extends it; putting `since` in the key
       * would mint a fresh entry per tick and the log would restart from empty every
       * time. Part 14 owns the polling that fills it.
       */
      events: (id: string) => [...qk.ballots.runs.all, 'detail', id, 'events'] as const,
    },
  },
} as const
