import { z } from 'zod'
import { API_BASE_URL, apiFetch, type QueryParams } from './client'
import {
  accountSchema,
  accountStatsSchema,
  accountResultSchema,
  activityEntrySchema,
  ballotProfileSchema,
  ballotRunSchema,
  ballotTaskSchema,
  bulkActionResultSchema,
  bulkImportResultSchema,
  clubRefSchema,
  fixtureSchema,
  seatmapSchema,
  imapAccountSchema,
  importRowVerdictSchema,
  kpiSetSchema,
  notificationSchema,
  proxySchema,
  revealSchema,
  revenuePointSchema,
  runEventSchema,
  searchResultSchema,
  ticketSchema,
  type AccountCreate,
  type AccountPatch,
  type RegistrationCreate,
  type BallotProfileInput,
  type RunCreate,
  type TicketPatch,
} from './schemas'
import type {
  AccountStatus,
  BallotClubId,
  ClubId,
  Competition,
  ProxyStatus,
  RunStatus,
  TaskStatus,
} from '@/lib/types'

/**
 * One thin typed function per §6.3 endpoint. These are the only callers of
 * `apiFetch`, and hooks are the only callers of these.
 */

/* --------------------------------------------------------------- filters */

export interface ListParams extends QueryParams {
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
  q?: string
}

export interface AccountFilters extends ListParams {
  club?: ClubId[]
  status?: AccountStatus[]
  membershipType?: string[]
  tag?: string[]
  proxyId?: string[]
}

export interface FixtureFilters extends ListParams {
  club?: ClubId[]
  competition?: Competition[]
  when?: 'all' | 'upcoming' | 'past'
  accountId?: string
}

export interface TicketFilters extends ListParams {
  accountId?: string[]
  block?: string[]
  row?: string[]
  status?: string[]
}

export interface ProxyFilters extends ListParams {
  status?: ProxyStatus[]
  groupId?: string[]
}

export interface RunFilters extends ListParams {
  status?: RunStatus[]
}

export interface TaskFilters extends ListParams {
  status?: TaskStatus[]
  clubId?: BallotClubId[]
}

/* -------------------------------------------------------------- accounts */

export const accountsApi = {
  list: (params: AccountFilters = {}) =>
    apiFetch('/accounts', { query: params, schema: z.array(accountSchema) }),

  get: (id: string) => apiFetch(`/accounts/${id}`, { schema: accountSchema }),

  create: (body: AccountCreate) =>
    apiFetch('/accounts', { method: 'POST', body, schema: accountSchema }),

  /** The full membership registration — the rich superset, tokenized payment only. */
  register: (body: RegistrationCreate) =>
    apiFetch('/accounts/register', { method: 'POST', body, schema: accountSchema }),

  patch: (id: string, body: AccountPatch) =>
    apiFetch(`/accounts/${id}`, { method: 'PATCH', body, schema: accountSchema }),

  remove: (ids: string[]) =>
    apiFetch('/accounts', { method: 'DELETE', body: { ids }, schema: bulkActionResultSchema }),

  bulkCreate: (rows: unknown[], onDuplicate: 'skip' | 'update' = 'skip') =>
    apiFetch('/accounts/bulk', {
      method: 'POST',
      body: { rows, onDuplicate },
      schema: bulkImportResultSchema,
    }),

  validateImport: (rows: Array<Record<string, string | null>>) =>
    apiFetch('/accounts/import/validate', {
      method: 'POST',
      body: { rows },
      schema: z.array(importRowVerdictSchema),
    }),

  /** The one endpoint that returns a plaintext password. Audit-logged server side. */
  reveal: (id: string) =>
    apiFetch(`/accounts/${id}/reveal`, { method: 'POST', schema: revealSchema }),

  action: (id: string, action: 'login' | 'relogin' | 'reset-password') =>
    apiFetch(`/accounts/${id}/${action}`, { method: 'POST', schema: accountSchema }),

  stats: (query?: QueryParams) =>
    apiFetch('/accounts/stats', { query, schema: accountStatsSchema }),
}

/* ----------------------------------------------------------------- clubs */

export const clubsApi = {
  list: () => apiFetch('/clubs', { query: { pageSize: 100 }, schema: z.array(clubRefSchema) }),
}

/* -------------------------------------------------------------- fixtures */

export const fixturesApi = {
  list: (params: FixtureFilters = {}) =>
    apiFetch('/fixtures', { query: params, schema: z.array(fixtureSchema) }),

  get: (id: string) => apiFetch(`/fixtures/${id}`, { schema: fixtureSchema }),

  tickets: (id: string, params: TicketFilters = {}) =>
    apiFetch(`/fixtures/${id}/tickets`, { query: params, schema: z.array(ticketSchema) }),

  seatmap: (id: string) => apiFetch(`/fixtures/${id}/seatmap`, { schema: seatmapSchema }),
}

/* --------------------------------------------------------------- tickets */

const ticketActionResultSchema = z.object({
  tickets: z.array(ticketSchema),
})

export type TicketActionName = 'group' | 'transfer' | 'share'

export const ticketsApi = {
  action: (action: TicketActionName, body: { ids: string[] }) =>
    apiFetch(`/tickets/${action}`, { method: 'POST', body, schema: ticketActionResultSchema }),

  /**
   * `query` exists so `?__fail=500` can be forced on a write — it is how the optimistic
   * rollback on the seat table is demonstrated (§6.2 failure injection). A real backend
   * ignores it.
   */
  patch: (id: string, body: TicketPatch, query?: QueryParams) =>
    apiFetch(`/tickets/${id}`, { method: 'PATCH', body, query, schema: ticketSchema }),

  remove: (ids: string[]) =>
    apiFetch('/tickets', { method: 'DELETE', body: { ids }, schema: bulkActionResultSchema }),
}

/* --------------------------------------------------------------- proxies */

const proxyBulkResultSchema = z.object({
  created: z.int().nonnegative(),
  errors: z.array(z.object({ row: z.int(), message: z.string() })),
  proxies: z.array(proxySchema),
})

export const proxiesApi = {
  list: (params: ProxyFilters = {}) =>
    apiFetch('/proxies', { query: params, schema: z.array(proxySchema) }),

  bulkCreate: (lines: string[], groupId?: string) =>
    apiFetch('/proxies/bulk', {
      method: 'POST',
      body: { lines, groupId },
      schema: proxyBulkResultSchema,
    }),

  test: (id: string) => apiFetch(`/proxies/${id}/test`, { method: 'POST', schema: proxySchema }),
}

/* ------------------------------------------------------------- dashboard */

export const dashboardApi = {
  kpis: (query?: QueryParams) => apiFetch('/kpis', { query, schema: kpiSetSchema }),

  revenue: (groupBy: 'month' = 'month', query?: QueryParams) =>
    apiFetch('/revenue', {
      query: { groupBy, ...query },
      schema: z.array(revenuePointSchema),
    }),

  activity: (params: ListParams & { source?: string[]; kind?: string[] } = {}) =>
    apiFetch('/activity', { query: params, schema: z.array(activityEntrySchema) }),
}

/* --------------------------------------------------------- notifications */

const notificationsReadSchema = z.object({
  affected: z.int().nonnegative(),
  notifications: z.array(notificationSchema),
})

export const notificationsApi = {
  list: (params: ListParams & { kind?: string[]; unread?: boolean } = {}) =>
    apiFetch('/notifications', { query: params, schema: z.array(notificationSchema) }),

  /** Omit `ids` to mark everything read. */
  markRead: (ids?: string[]) =>
    apiFetch('/notifications/read', {
      method: 'POST',
      body: { ids },
      schema: notificationsReadSchema,
    }),
}

/* ---------------------------------------------------------------- search */

export const searchApi = {
  query: (q: string) => apiFetch('/search', { query: { q }, schema: z.array(searchResultSchema) }),
}

/* --------------------------------------------------------------- ballots */

const pasteResultSchema = z.object({
  created: z.int().nonnegative(),
  updated: z.int().nonnegative(),
  skipped: z.int().nonnegative(),
  errors: z.array(z.object({ row: z.int(), email: z.string().optional(), message: z.string() })),
})

const removedSchema = z.object({ id: z.string() })

export type RunAction = 'pause' | 'resume' | 'stop' | 'retry-failed'

export const ballotsApi = {
  /* ------------------------------------------------------------- profiles */

  profiles: (params: ListParams = {}) =>
    apiFetch('/ballots/profiles', { query: params, schema: z.array(ballotProfileSchema) }),

  createProfile: (body: BallotProfileInput) =>
    apiFetch('/ballots/profiles', { method: 'POST', body, schema: ballotProfileSchema }),

  updateProfile: (id: string, body: BallotProfileInput) =>
    apiFetch(`/ballots/profiles/${id}`, { method: 'PATCH', body, schema: ballotProfileSchema }),

  deleteProfile: (id: string) =>
    apiFetch(`/ballots/profiles/${id}`, { method: 'DELETE', schema: removedSchema }),

  /* ----------------------------------------------------------------- pool */

  /**
   * The §B5.1 loader. The block goes up once and is never persisted anywhere on the
   * client — no draft in localStorage, no copy in a query cache (§B7 rule 2).
   */
  paste: (club: BallotClubId, text: string) =>
    apiFetch('/ballots/accounts/paste', {
      method: 'POST',
      body: { club, text },
      schema: pasteResultSchema,
    }),

  /** The mailboxes `otpSource: 'imap'` can point at. */
  imap: () => apiFetch('/ballots/imap', { schema: z.array(imapAccountSchema) }),

  /** The `LAST_RUN` / `LAST_RESULT` join, for the whole pool at once. */
  accountResults: () =>
    apiFetch('/ballots/accounts/results', { schema: z.array(accountResultSchema) }),

  /* ----------------------------------------------------------------- runs */

  runs: (params: RunFilters = {}) =>
    apiFetch('/ballots/runs', { query: params, schema: z.array(ballotRunSchema) }),

  run: (id: string) => apiFetch(`/ballots/runs/${id}`, { schema: ballotRunSchema }),

  createRun: (body: RunCreate) =>
    apiFetch('/ballots/runs', { method: 'POST', body, schema: ballotRunSchema }),

  deleteRun: (id: string) =>
    apiFetch(`/ballots/runs/${id}`, { method: 'DELETE', schema: removedSchema }),

  action: (id: string, action: RunAction) =>
    apiFetch(`/ballots/runs/${id}/${action}`, { method: 'POST', schema: ballotRunSchema }),

  tasks: (id: string, params: TaskFilters = {}) =>
    apiFetch(`/ballots/runs/${id}/tasks`, {
      query: params,
      schema: z.array(ballotTaskSchema),
    }),

  /**
   * The cursor feed. `since` is the `meta.lastSeq` of the previous response, so the
   * caller appends what comes back and never deduplicates.
   */
  events: (id: string, since = 0, limit?: number) =>
    apiFetch(`/ballots/runs/${id}/events`, {
      query: { since, limit },
      schema: z.array(runEventSchema),
    }),

  /**
   * The CSV is a download, not a resource read — it comes back as a file rather than
   * the envelope, so it is a plain href the browser handles, not an `apiFetch` whose
   * result would have to be turned back into a Blob.
   */
  exportUrl: (id: string) => `${API_BASE_URL}/ballots/runs/${id}/export`,
}
