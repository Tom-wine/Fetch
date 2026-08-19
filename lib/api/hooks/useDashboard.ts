'use client'

import { useQuery } from '@tanstack/react-query'
import { ApiError, type ApiResult } from '../client'
import {
  clubsApi,
  dashboardApi,
  notificationsApi,
  proxiesApi,
  searchApi,
  type ListParams,
  type ProxyFilters,
} from '../endpoints'
import type {
  ActivityEntry,
  AppNotification,
  ClubRef,
  KpiSet,
  Proxy,
  RevenuePoint,
  SearchResult,
} from '@/lib/types'
import { qk } from './keys'
import { useOptimisticMutation } from './useOptimisticMutation'
import { toTableState, type TableState } from './useAccounts'

/**
 * §6.2 failure injection. `?__fail=500` on /dashboard is forwarded onto every read
 * the screen makes, because on this screen the error state IS the thing being
 * demonstrated — four panels that each have to fail independently and each offer
 * their own retry.
 */
function failQuery(fail?: number | null) {
  return fail ? { __fail: fail } : undefined
}

export function useKpis(fail?: number | null) {
  return useQuery<ApiResult<KpiSet>, ApiError>({
    queryKey: qk.dashboard.kpis(fail),
    queryFn: () => dashboardApi.kpis(failQuery(fail)),
  })
}

export function useRevenue(groupBy: 'month' = 'month', fail?: number | null) {
  return useQuery<ApiResult<RevenuePoint[]>, ApiError>({
    queryKey: qk.dashboard.revenue(groupBy, fail),
    queryFn: () => dashboardApi.revenue(groupBy, failQuery(fail)),
  })
}

export function useActivity(filters: ListParams & { source?: string[] } = {}) {
  return useQuery<ApiResult<ActivityEntry[]>, ApiError>({
    queryKey: qk.dashboard.activity(filters),
    queryFn: () => dashboardApi.activity(filters),
    placeholderData: (previous) => previous,
  })
}

/** Reference data — effectively static, so it is cached for the session. */
export function useClubs() {
  return useQuery<ApiResult<ClubRef[]>, ApiError>({
    queryKey: qk.clubs.list(),
    queryFn: () => clubsApi.list(),
    staleTime: Infinity,
  })
}

export function useProxies(filters: ProxyFilters = {}) {
  return useQuery<ApiResult<Proxy[]>, ApiError>({
    queryKey: qk.proxies.list(filters),
    queryFn: () => proxiesApi.list(filters),
    placeholderData: (previous) => previous,
  })
}

export function useProxiesTable(filters: ProxyFilters = {}): TableState<Proxy> {
  return toTableState(useProxies(filters))
}

export function useTestProxy() {
  return useOptimisticMutation<{ id: string }, ApiResult<Proxy>>({
    mutationFn: ({ id }) => proxiesApi.test(id),
    keys: () => [qk.proxies.all],
    successMessage: (result) =>
      result.data.status === 'ok'
        ? `${result.data.label} responded in ${result.data.latencyMs}ms.`
        : `${result.data.label} did not respond.`,
  })
}

/* --------------------------------------------------------- notifications */

export function useNotifications(filters: ListParams & { unread?: boolean } = {}) {
  return useQuery<ApiResult<AppNotification[]>, ApiError>({
    queryKey: qk.notifications.list(filters),
    queryFn: () => notificationsApi.list(filters),
  })
}

export function useMarkNotificationsRead() {
  return useOptimisticMutation<
    { ids?: string[] },
    ApiResult<{ affected: number; notifications: AppNotification[] }>
  >({
    mutationFn: ({ ids }) => notificationsApi.markRead(ids),
    keys: () => [qk.notifications.all],
    optimistic: (previous, { ids }) => {
      if (!previous || typeof previous !== 'object') return previous
      const page = previous as { data?: unknown }
      if (!Array.isArray(page.data)) return previous
      const set = ids ? new Set(ids) : null
      return {
        ...page,
        data: (page.data as AppNotification[]).map((n) =>
          !set || set.has(n.id) ? { ...n, unread: false } : n,
        ),
      }
    },
    // Marking read is housekeeping; a toast for it would be noise.
    successMessage: () => null,
  })
}

/* ---------------------------------------------------------------- search */

export function useSearch(q: string) {
  return useQuery<ApiResult<SearchResult[]>, ApiError>({
    queryKey: qk.search.query(q),
    queryFn: () => searchApi.query(q),
    enabled: q.trim().length > 1,
    staleTime: 30_000,
  })
}
