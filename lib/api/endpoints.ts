import { z } from 'zod'
import { apiFetch, type QueryParams } from './client'
import {
  accountSchema,
  accountStatsSchema,
  activityEntrySchema,
  bulkActionResultSchema,
  bulkImportResultSchema,
  clubRefSchema,
  fixtureSchema,
  importRowVerdictSchema,
  kpiSetSchema,
  listingSchema,
  notificationSchema,
  proxySchema,
  revealSchema,
  revenuePointSchema,
  searchResultSchema,
  ticketSchema,
  type AccountCreate,
  type AccountPatch,
  type ListingBulk,
  type ListingPatch,
} from './schemas'
import type {
  AccountStatus,
  ClubId,
  Competition,
  ListingStatus,
  Platform,
  ProxyStatus,
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

export interface ListingFilters extends ListParams {
  platform?: Platform[]
  accountId?: string[]
  status?: ListingStatus[]
  fixtureId?: string[]
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

/* -------------------------------------------------------------- accounts */

export const accountsApi = {
  list: (params: AccountFilters = {}) =>
    apiFetch('/accounts', { query: params, schema: z.array(accountSchema) }),

  get: (id: string) => apiFetch(`/accounts/${id}`, { schema: accountSchema }),

  create: (body: AccountCreate) =>
    apiFetch('/accounts', { method: 'POST', body, schema: accountSchema }),

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

  stats: () => apiFetch('/accounts/stats', { schema: accountStatsSchema }),
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
}

/* --------------------------------------------------------------- tickets */

const ticketActionResultSchema = z.object({
  tickets: z.array(ticketSchema),
  listings: z.array(listingSchema),
})

export const ticketsApi = {
  action: (
    action: 'group' | 'list' | 'transfer' | 'share',
    body: { ids: string[]; platform?: Platform; price?: number },
  ) => apiFetch(`/tickets/${action}`, { method: 'POST', body, schema: ticketActionResultSchema }),

  remove: (ids: string[]) =>
    apiFetch('/tickets', { method: 'DELETE', body: { ids }, schema: bulkActionResultSchema }),
}

/* -------------------------------------------------------------- listings */

const listingBulkResultSchema = z.object({
  affected: z.int().nonnegative(),
  ids: z.array(z.string()),
  listings: z.array(listingSchema),
})

export const listingsApi = {
  list: (params: ListingFilters = {}) =>
    apiFetch('/listings', { query: params, schema: z.array(listingSchema) }),

  /**
   * `query` exists so `?__fail=500` can be forced on a write, which is how the
   * optimistic rollback is demonstrated (§6.2 failure injection). A real backend
   * simply ignores the parameter.
   */
  patch: (id: string, body: ListingPatch, query?: QueryParams) =>
    apiFetch(`/listings/${id}`, { method: 'PATCH', body, query, schema: listingSchema }),

  bulk: (body: ListingBulk) =>
    apiFetch('/listings/bulk', { method: 'POST', body, schema: listingBulkResultSchema }),
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
  kpis: () => apiFetch('/kpis', { schema: kpiSetSchema }),

  revenue: (groupBy: 'month' = 'month') =>
    apiFetch('/revenue', { query: { groupBy }, schema: z.array(revenuePointSchema) }),

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
