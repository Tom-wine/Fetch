'use client'

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { ApiError, ApiResult } from '../client'
import {
  ballotsApi,
  type ListParams,
  type RunAction,
  type RunFilters,
  type TaskFilters,
} from '../endpoints'
import type { AccountResult, BallotProfileInput, RunCreate } from '../schemas'
import type {
  BallotClubId,
  BallotProfile,
  ImapAccount,
  BallotRun,
  BallotTask,
  RunEvent,
} from '@/lib/types'
import { qk } from './keys'
import { toTableState, type TableState } from './useAccounts'
import { removeFromList, useOptimisticMutation } from './useOptimisticMutation'

/**
 * The ballots data layer (§B4).
 *
 * NO POLLING LIVES HERE. Every hook below fetches once and stays put; the live run
 * monitor is Part 14 and owns its own cadence, because the polling interval is a
 * property of the screen watching a run, not of the run itself. A `refetchInterval`
 * baked in here would tick on /accounts too, for a run nobody is looking at.
 */

/**
 * The mailboxes a profile can read codes from. Cached hard: mailboxes are configured
 * once and this list is read by the profile form and the launcher on every open.
 */
export function useImapAccounts() {
  return useQuery<ApiResult<ImapAccount[]>, ApiError>({
    queryKey: qk.ballots.imap(),
    queryFn: () => ballotsApi.imap(),
    staleTime: 5 * 60_000,
  })
}

/* ------------------------------------------------------------------ profiles */

export function useBallotProfiles(filters: ListParams = {}) {
  return useQuery<ApiResult<BallotProfile[]>, ApiError>({
    queryKey: qk.ballots.profiles.list(filters),
    queryFn: () => ballotsApi.profiles(filters),
    placeholderData: (previous) => previous,
  })
}

export function useBallotProfilesTable(filters: ListParams = {}): TableState<BallotProfile> {
  return toTableState(useBallotProfiles(filters))
}

export function useCreateBallotProfile() {
  return useOptimisticMutation<BallotProfileInput, ApiResult<BallotProfile>>({
    mutationFn: (body) => ballotsApi.createProfile(body),
    keys: () => [qk.ballots.profiles.all],
    successMessage: (result) => `${result.data.name} saved.`,
  })
}

export function useUpdateBallotProfile() {
  return useOptimisticMutation<{ id: string; input: BallotProfileInput }, ApiResult<BallotProfile>>(
    {
      mutationFn: ({ id, input }) => ballotsApi.updateProfile(id, input),
      // Runs denormalise `profileName`, so an existing run's label does not change —
      // but the launcher reads the profile's settings live, so its cache must clear too.
      keys: () => [qk.ballots.profiles.all, qk.ballots.runs.lists()],
      successMessage: (result) => `${result.data.name} updated.`,
    },
  )
}

export function useDeleteBallotProfile() {
  return useOptimisticMutation<{ id: string; name: string }, ApiResult<{ id: string }>>({
    mutationFn: ({ id }) => ballotsApi.deleteProfile(id),
    keys: () => [qk.ballots.profiles.all],
    optimistic: (previous, { id }) => removeFromList<BallotProfile>(previous, [id]),
    successMessage: (_result, { name }) => `${name} deleted.`,
  })
}

/**
 * `Duplicate` (§B5.2) — a create, not a server-side clone, because the copy is
 * offered to the operator with an editable name rather than silently appearing.
 * The caller passes the source profile's settings and the new name.
 */
export function useDuplicateBallotProfile() {
  return useCreateBallotProfile()
}

/** Strips a profile down to the writable half, for `Duplicate` and `Edit` alike. */
export function toProfileInput(profile: BallotProfile): BallotProfileInput {
  return {
    name: profile.name,
    delayMinMs: profile.delayMinMs,
    delayMaxMs: profile.delayMaxMs,
    concurrency: profile.concurrency,
    maxRetries: profile.maxRetries,
    timeoutMs: profile.timeoutMs,
    proxyGroupId: profile.proxyGroupId,
    otpSource: profile.otpSource,
    imapId: profile.imapId,
    stopOnRateLimit: profile.stopOnRateLimit,
    webhookUrl: profile.webhookUrl,
    notes: profile.notes,
  }
}

/* ---------------------------------------------------------------------- pool */

export interface PasteResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; email?: string; message: string }>
}

/**
 * The §B5.1 quick loader.
 *
 * Not a `useOptimisticMutation`: there is nothing to apply optimistically — the
 * server decides how many lines were valid — and an optimistic write would mean
 * holding the pasted block in the cache, which is exactly what §B7 rule 2 forbids.
 * The block is passed in, sent, and dropped. The caller clears its field on success.
 */
export function usePasteAccounts() {
  const queryClient = useQueryClient()

  return useMutation<PasteResult, ApiError, { club: BallotClubId; text: string }>({
    mutationFn: async ({ club, text }) => (await ballotsApi.paste(club, text)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.accounts.all })
    },
  })
}

/**
 * The pool table's `LAST_RUN` and `LAST_RESULT`, keyed by account id.
 *
 * One request for the whole join rather than one per visible page: it is a small map
 * that does not grow with the table, so paging through the pool costs nothing.
 */
export function useAccountResults() {
  return useQuery<Map<string, AccountResult>, ApiError>({
    queryKey: qk.ballots.accountResults(),
    queryFn: async () => {
      const result = await ballotsApi.accountResults()
      return new Map(result.data.map((row) => [row.accountId, row]))
    },
  })
}

/* ---------------------------------------------------------------------- runs */

export function useBallotRuns(filters: RunFilters = {}) {
  return useQuery<ApiResult<BallotRun[]>, ApiError>({
    queryKey: qk.ballots.runs.list(filters),
    queryFn: () => ballotsApi.runs(filters),
    placeholderData: (previous) => previous,
    // A run advances on the server clock, so a cached list is stale the moment it
    // lands. Zero here means "refetch on focus and on mount" — not a poll.
    staleTime: 0,
  })
}

export function useBallotRunsTable(filters: RunFilters = {}): TableState<BallotRun> & {
  query: UseQueryResult<ApiResult<BallotRun[]>, ApiError>
} {
  const query = useBallotRuns(filters)
  return { ...toTableState(query), query }
}

export function useBallotRun(id: string | null) {
  return useQuery<ApiResult<BallotRun>, ApiError>({
    queryKey: qk.ballots.runs.detail(id ?? ''),
    queryFn: () => ballotsApi.run(id!),
    enabled: Boolean(id),
    staleTime: 0,
  })
}

export function useBallotTasks(id: string | null, filters: TaskFilters = {}) {
  return useQuery<ApiResult<BallotTask[]>, ApiError>({
    queryKey: qk.ballots.runs.tasks(id ?? '', filters),
    queryFn: () => ballotsApi.tasks(id!, filters),
    enabled: Boolean(id),
    placeholderData: (previous) => previous,
    staleTime: 0,
  })
}

/**
 * One page of the event feed, from `since` forward.
 *
 * A bare fetch rather than a query, because the feed is a cursor and not a
 * resource: the answer depends on where the caller already is. Part 14 calls this in
 * its own loop and appends — `meta.lastSeq` is the next `since`, and the endpoint
 * guarantees `seq > since`, so appending is safe and no deduplication is needed.
 */
export function useRunEventsFetcher() {
  return async (
    id: string,
    since: number,
  ): Promise<{ events: RunEvent[]; lastSeq: number; hasMore: boolean }> => {
    const result = await ballotsApi.events(id, since)
    return {
      events: result.data,
      lastSeq: result.meta?.lastSeq ?? since,
      hasMore: result.meta?.hasMore ?? false,
    }
  }
}

/* ----------------------------------------------------------------- mutations */

export function useCreateRun() {
  return useOptimisticMutation<RunCreate, ApiResult<BallotRun>>({
    mutationFn: (body) => ballotsApi.createRun(body),
    keys: () => [qk.ballots.runs.all],
    successMessage: (result) => `${result.data.label} started.`,
  })
}

export function useDeleteRun() {
  return useOptimisticMutation<{ id: string }, ApiResult<{ id: string }>>({
    mutationFn: ({ id }) => ballotsApi.deleteRun(id),
    keys: () => [qk.ballots.runs.all],
    optimistic: (previous, { id }) => removeFromList<BallotRun>(previous, [id]),
    successMessage: () => 'Run deleted.',
  })
}

const ACTION_MESSAGE: Record<RunAction, (run: BallotRun) => string> = {
  pause: () => 'Run paused.',
  resume: () => 'Run resumed.',
  stop: (run) => `Run stopped. ${run.counts.skipped} accounts were not attempted.`,
  // retry-failed returns a DIFFERENT run — the original is left intact as the record
  // of what happened — so the message names the new one.
  'retry-failed': (run) => `${run.counts.total} failed accounts requeued as ${run.label}.`,
}

/** `pause` · `resume` · `stop` · `retry-failed`. */
export function useRunAction() {
  return useOptimisticMutation<{ id: string; action: RunAction }, ApiResult<BallotRun>>({
    mutationFn: ({ id, action }) => ballotsApi.action(id, action),
    keys: () => [qk.ballots.runs.all],
    successMessage: (result, { action }) => ACTION_MESSAGE[action](result.data),
  })
}
