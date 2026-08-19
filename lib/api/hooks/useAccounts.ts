'use client'

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { ApiError, type ApiResult } from '../client'
import { accountsApi, type AccountFilters } from '../endpoints'
import type { AccountCreate, AccountPatch } from '../schemas'
import type {
  Account,
  AccountStats,
  AccountStatus,
  BulkImportResult,
  ClubId,
  ImportRowVerdict,
} from '@/lib/types'
import { qk } from './keys'
import { patchInList, removeFromList, useOptimisticMutation } from './useOptimisticMutation'

/**
 * The shape DataTable already expects (Part 2): `loading`, `error: string | null`,
 * `onRetry`. `toTableState` maps a query result onto it so no screen invents a
 * second loading convention.
 */
export interface TableState<T> {
  rows: T[]
  total: number
  loading: boolean
  error: string | null
  onRetry: () => void
  /** Present so a screen can distinguish a background refetch from a cold load. */
  fetching: boolean
}

export function toTableState<T>(query: UseQueryResult<ApiResult<T[]>, ApiError>): TableState<T> {
  return {
    rows: query.data?.data ?? [],
    total: query.data?.meta?.total ?? query.data?.data.length ?? 0,
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    onRetry: () => void query.refetch(),
    fetching: query.isFetching,
  }
}

export function useAccounts(filters: AccountFilters = {}) {
  return useQuery<ApiResult<Account[]>, ApiError>({
    queryKey: qk.accounts.list(filters),
    queryFn: () => accountsApi.list(filters),
    // Keeps the previous page on screen while the next one loads, so paging does not
    // flash the skeleton.
    placeholderData: (previous) => previous,
  })
}

/** Same query, pre-mapped onto the DataTable prop shape. */
export function useAccountsTable(filters: AccountFilters = {}): TableState<Account> & {
  query: UseQueryResult<ApiResult<Account[]>, ApiError>
} {
  const query = useAccounts(filters)
  return { ...toTableState(query), query }
}

export function useAccount(id: string | null) {
  return useQuery<ApiResult<Account>, ApiError>({
    queryKey: qk.accounts.detail(id ?? ''),
    queryFn: () => accountsApi.get(id!),
    enabled: Boolean(id),
  })
}

export function useAccountStats(fail?: number | null) {
  return useQuery<ApiResult<AccountStats>, ApiError>({
    queryKey: qk.accounts.stats(fail),
    queryFn: () => accountsApi.stats(fail ? { __fail: fail } : undefined),
  })
}

/* ------------------------------------------------------------- mutations */

export function useCreateAccount() {
  return useOptimisticMutation<AccountCreate, ApiResult<Account>>({
    mutationFn: (body) => accountsApi.create(body),
    keys: () => [qk.accounts.all],
    successMessage: (result) => `${result.data.email} added.`,
  })
}

export function useUpdateAccount() {
  return useOptimisticMutation<{ id: string; patch: AccountPatch }, ApiResult<Account>>({
    mutationFn: ({ id, patch }) => accountsApi.patch(id, patch),
    keys: () => [qk.accounts.all],
    optimistic: (previous, { id, patch }) =>
      patchInList<Account>(previous, id, patch as Partial<Account>),
    successMessage: () => 'Account updated.',
  })
}

export function useDeleteAccounts() {
  return useOptimisticMutation<{ ids: string[] }, ApiResult<{ affected: number; ids: string[] }>>({
    mutationFn: ({ ids }) => accountsApi.remove(ids),
    keys: () => [qk.accounts.all],
    optimistic: (previous, { ids }) => removeFromList<Account>(previous, ids),
    successMessage: (_result, { ids }) =>
      `${ids.length} ${ids.length === 1 ? 'account' : 'accounts'} deleted.`,
  })
}

/** `login` / `relogin` / `reset-password` — the §8.2 row actions. */
export function useAccountAction() {
  return useOptimisticMutation<
    { id: string; action: 'login' | 'relogin' | 'reset-password' },
    ApiResult<Account>
  >({
    mutationFn: ({ id, action }) => accountsApi.action(id, action),
    keys: () => [qk.accounts.all],
    successMessage: (result, { action }) =>
      action === 'reset-password'
        ? `Password reset for ${result.data.email}.`
        : `${result.data.email} signed in.`,
  })
}

/**
 * Backs PasswordCell's `onReveal`. Deliberately NOT a TanStack mutation with a
 * cache: a revealed password must never be written into the query cache, where it
 * would sit in memory long after the cell re-masked. It is a bare call whose result
 * lives only in the cell's own state for ten seconds.
 */
export function useRevealPassword() {
  return (id: string) => async () => {
    const result = await accountsApi.reveal(id)
    return result.data.password
  }
}

/* ------------------------------------------------- the whole matching set */

/**
 * The mock clamps `pageSize` at 200 (lib/mock/http.ts `listQuery`), and a real
 * backend will clamp it too.
 */
const MAX_PAGE_SIZE = 200

/**
 * Every account matching a filter set, not just the visible page.
 *
 * Backs two things on /accounts that must never guess: `Export`, which writes the
 * FILTERED set to CSV rather than the page the operator happens to be on, and the
 * bulk-selection escalation, which turns "this page" into an explicit id set so a
 * bulk delete can name the real count.
 *
 * One request covers the common case. The loop only runs when the match set is
 * larger than the server's page clamp — a bulk action operating on a silently
 * truncated set is exactly the failure the escalation exists to prevent.
 */
export async function fetchAllMatchingAccounts(filters: AccountFilters): Promise<Account[]> {
  const base: AccountFilters = { ...filters, page: 1, pageSize: MAX_PAGE_SIZE }
  const first = await accountsApi.list(base)
  const rows = [...first.data]
  const totalPages = first.meta?.totalPages ?? 1

  for (let page = 2; page <= totalPages; page++) {
    const next = await accountsApi.list({ ...base, page })
    rows.push(...next.data)
  }

  return rows
}

/* ------------------------------------------------------- bulk maintenance */

/**
 * Runs `fn` over `items` with at most `limit` requests in flight. 64 sequential
 * round-trips against a 400ms mock is half a minute of nothing happening; 64 at
 * once is a thundering herd at a real backend.
 */
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      out[index] = await fn(items[index]!)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/** Applies one patch to many rows inside a cached list. */
function patchManyInList(previous: unknown, ids: string[], patch: Partial<Account>): unknown {
  return ids.reduce<unknown>((acc, id) => patchInList<Account>(acc, id, patch), previous)
}

/**
 * `Check status` — the bulk twin of the row-level Relogin. There is no bulk
 * endpoint in §6.3 and none is needed: the per-account action is idempotent, so the
 * client fans out and reports one result.
 */
export function useCheckAccounts() {
  return useOptimisticMutation<{ ids: string[] }, { checked: number }>({
    mutationFn: async ({ ids }) => {
      await pooled(ids, 6, (id) => accountsApi.action(id, 'relogin'))
      return { checked: ids.length }
    },
    keys: () => [qk.accounts.all],
    successMessage: ({ checked }) =>
      `${checked} ${checked === 1 ? 'account' : 'accounts'} checked.`,
  })
}

/** `Assign proxy` — one PATCH per account, optimistic on every cached list. */
export function useAssignProxy() {
  return useOptimisticMutation<{ ids: string[]; proxyId: string }, { affected: number }>({
    mutationFn: async ({ ids, proxyId }) => {
      await pooled(ids, 6, (id) => accountsApi.patch(id, { proxyId }))
      return { affected: ids.length }
    },
    keys: () => [qk.accounts.all],
    optimistic: (previous, { ids, proxyId }) => patchManyInList(previous, ids, { proxyId }),
    successMessage: ({ affected }) =>
      `Proxy assigned to ${affected} ${affected === 1 ? 'account' : 'accounts'}.`,
  })
}

/**
 * `Add tag`. Takes the accounts rather than the ids because PATCH replaces the tag
 * array wholesale — patching by id alone would silently drop every tag an account
 * already had.
 */
export function useTagAccounts() {
  return useOptimisticMutation<{ accounts: Account[]; tag: string }, { affected: number }>({
    mutationFn: async ({ accounts, tag }) => {
      const targets = accounts.filter((a) => !a.tags.includes(tag))
      await pooled(targets, 6, (a) => accountsApi.patch(a.id, { tags: [...a.tags, tag] }))
      return { affected: targets.length }
    },
    keys: () => [qk.accounts.all],
    successMessage: ({ affected }, { tag }) =>
      affected === 0
        ? `Every selected account already had ${tag}.`
        : `${tag} added to ${affected} ${affected === 1 ? 'account' : 'accounts'}.`,
  })
}

/**
 * Every tag in use, for the toolbar's `Tag ▾`.
 *
 * There is no `/tags` endpoint in §6.3 and adding one would be a backend change for
 * a facet, so the list is derived from the accounts themselves. Cached for five
 * minutes: tags change when someone edits an account, not between keystrokes.
 */
export function useAccountTags() {
  return useQuery<string[], ApiError>({
    queryKey: [...qk.accounts.matching({}), 'tags'],
    queryFn: async () => {
      const rows = await fetchAllMatchingAccounts({})
      return [...new Set(rows.flatMap((row) => row.tags))].sort((a, b) => a.localeCompare(b))
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * The counts behind the club tabs and the status chips.
 *
 * Prefers `GET /accounts/stats`, which is what the endpoint is for. It falls back to
 * deriving the same numbers from the account list when that call fails, because as
 * of today it always does: `accountStatsSchema` builds `byClub` with
 * `z.record(clubIdSchema, …)`, and a Zod 4 record keyed by an enum is exhaustive —
 * it demands a key for all twenty clubs, while the endpoint (correctly) only emits
 * the fifteen that have accounts. See the ASK in fetch-sync.md; the fix is one word,
 * in a file this session does not own.
 *
 * The fallback is not free — it reads every account — so it is a fallback and not
 * the primary path. The moment the schema is corrected, the fast path takes over on
 * its own and nothing here needs editing.
 */
export function useAccountFacets() {
  return useQuery<AccountStats, ApiError>({
    queryKey: [...qk.accounts.stats(), 'facets'],
    queryFn: async () => {
      try {
        return (await accountsApi.stats()).data
      } catch {
        const rows = await fetchAllMatchingAccounts({})
        const byStatus = {} as Record<AccountStatus, number>
        const byClub: Partial<Record<ClubId, number>> = {}

        for (const row of rows) {
          byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
          byClub[row.club] = (byClub[row.club] ?? 0) + 1
        }

        return { total: rows.length, byStatus, byClub }
      }
    },
  })
}

/* ---------------------------------------------------------------- import */

/**
 * The live duplicate check behind the manual-entry form's email field (§8.3).
 *
 * `GET /accounts?q=` substring-matches the email column, so one request answers
 * "does this address already have an account?" without loading the whole list. The
 * caller debounces; this only refuses to run until the address is plausibly complete,
 * because a query for `j` matches sixty rows and tells the operator nothing.
 */
export function useEmailDuplicate(email: string) {
  const normalised = email.trim().toLowerCase()
  const plausible = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalised)

  return useQuery<Account | null, ApiError>({
    queryKey: [...qk.accounts.lists(), 'email', normalised],
    queryFn: async () => {
      const result = await accountsApi.list({ q: normalised, pageSize: 5 })
      return result.data.find((a) => a.email.toLowerCase() === normalised) ?? null
    },
    enabled: plausible,
    // An address that has an account keeps having one; this need not be fresh to
    // the second, and the field is typed in character by character.
    staleTime: 30_000,
  })
}

/**
 * The step-3 server dry run — `POST /accounts/import/validate`.
 *
 * The wizard validates every §8.3 rule client-side so the counters stay live while
 * the operator edits. This call exists for the one question the client cannot answer
 * from the page it is on: which of these emails ALREADY have an account. It returns
 * that set, so the duplicate rule can then be re-evaluated locally on every edit
 * without another round trip.
 */
export function useImportDryRun() {
  return useMutation<
    { verdicts: ImportRowVerdict[]; existingEmails: Map<string, string> },
    ApiError,
    { rows: Array<Record<string, string | null>> }
  >({
    mutationFn: async ({ rows }) => {
      const result = await accountsApi.validateImport(rows)
      const existingEmails = new Map<string, string>()

      for (const verdict of result.data) {
        // The endpoint phrases it as "An account with this email already exists."
        if (verdict.email && verdict.messages.some((m) => m.includes('already exists'))) {
          existingEmails.set(verdict.email.toLowerCase(), verdict.email)
        }
      }

      return { verdicts: result.data, existingEmails }
    },
  })
}

/** How many rows go up in one `POST /accounts/bulk`. */
const IMPORT_CHUNK = 200

export interface BulkImportInput {
  rows: unknown[]
  onDuplicate: 'skip' | 'update'
  /** Called after each chunk lands, so step 4's bar reports real progress. */
  onProgress?: (done: number, total: number) => void
}

/**
 * The commit (§8.3 step 4).
 *
 * Posted in chunks rather than as one 5000-row body, for two reasons that both show
 * up on a real backend: a single request gives the progress bar nothing to report
 * except "waiting", and one oversized body is the request a proxy in front of the API
 * drops at exactly the wrong moment. The chunk boundary is invisible in the result —
 * the counts are summed and every error's row number is shifted back onto the row it
 * has in the operator's file, so "row 314" means line 315 of their CSV.
 */
export function useBulkImport() {
  const queryClient = useQueryClient()

  return useMutation<BulkImportResult, ApiError, BulkImportInput>({
    mutationFn: async ({ rows, onDuplicate, onProgress }) => {
      const total = rows.length
      const summary: BulkImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }

      for (let start = 0; start < total; start += IMPORT_CHUNK) {
        const chunk = rows.slice(start, start + IMPORT_CHUNK)
        const result = await accountsApi.bulkCreate(chunk, onDuplicate)

        summary.created += result.data.created
        summary.updated += result.data.updated
        summary.skipped += result.data.skipped
        for (const error of result.data.errors) {
          summary.errors.push({ ...error, row: error.row + start })
        }

        onProgress?.(Math.min(start + chunk.length, total), total)
      }

      return summary
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.accounts.all })
    },
  })
}
