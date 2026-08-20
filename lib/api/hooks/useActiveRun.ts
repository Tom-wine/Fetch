'use client'

import { useQuery } from '@tanstack/react-query'

import { ApiError, type ApiResult } from '../client'
import { ballotsApi, type RunFilters } from '../endpoints'
import { isRunActive } from '@/components/ballots/vocabulary'
import type { Account, BallotProfile, BallotRun, ImapAccount } from '@/lib/types'
import { BALLOT_CLUB_IDS } from '@/lib/types'
import { fetchAllMatchingAccounts } from './useAccounts'
import { useBallotProfiles, useImapAccounts } from './useBallots'
import { qk } from './keys'
import type { RunRequirements } from '@/lib/ballots/readiness'

/**
 * The run everything else on the app watches.
 *
 * ONE query, shared. The dashboard's ACTIVE_RUN card and the Topbar's run strip both
 * ask this hook, and because both land on the same key TanStack answers them from one
 * request and one interval — two components, one poll. That is the whole reason this
 * is a hook over a fixed filter rather than a `useBallotRuns({...})` call at each site
 * with slightly different arguments.
 *
 * The cadence is the run's, not the screen's. §B7 rule 4 is about not polling for a run
 * nobody is looking at, and the strip changes that calculation: from Part 14 on, SOMEONE
 * is always looking, on every screen, for as long as a run is moving. So: 2s while a run
 * is active — the monitor's own cadence, so the strip and the monitor never disagree —
 * and 30s when none is, which is slow enough to be free and fast enough that a run
 * started from another tab shows up before the operator wonders where it went.
 *
 * Five runs rather than one: "the active run" and "the last finished run" are the same
 * question asked twice, the list is already sorted newest-first by the API, and asking
 * for one would mean a second request the moment nothing is running.
 */
const RECENT: RunFilters = { pageSize: 5 }

const ACTIVE_MS = 2_000
const IDLE_MS = 30_000

export interface ActiveRunState {
  /** RUNNING, PAUSED or QUEUED — the run that can still change on its own. */
  active: BallotRun | null
  /** The newest run that has finished, for when nothing is active. */
  last: BallotRun | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function useActiveRun(): ActiveRunState {
  const query = useQuery<ApiResult<BallotRun[]>, ApiError>({
    queryKey: qk.ballots.runs.list(RECENT),
    queryFn: () => ballotsApi.runs(RECENT),
    refetchInterval: (q) =>
      (q.state.data?.data ?? []).some((run) => isRunActive(run.status)) ? ACTIVE_MS : IDLE_MS,
    // A run's counts move every second; a stale banner claiming 12/22 when the monitor
    // says 19/22 is worse than no banner.
    staleTime: 0,
  })

  const runs = query.data?.data ?? []

  return {
    active: runs.find((run) => isRunActive(run.status)) ?? null,
    last: runs.find((run) => !isRunActive(run.status)) ?? null,
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    onRetry: () => void query.refetch(),
  }
}

/**
 * Every account in the seven ballot clubs, unpaged.
 *
 * Readiness is a question about the WHOLE pool — "how many can run tonight" — and a
 * page of 25 cannot answer it. The pool is a few hundred accounts at most, the endpoint
 * already pages, and `fetchAllMatchingAccounts` already walks it for the bulk-selection
 * escalation, so this is that same walk under a cache key rather than a new endpoint.
 */
export function usePoolAccounts() {
  const filters = { club: BALLOT_CLUB_IDS }

  const query = useQuery<Account[], ApiError>({
    queryKey: qk.accounts.matching(filters),
    queryFn: () => fetchAllMatchingAccounts(filters),
    staleTime: 30_000,
  })

  return {
    accounts: query.data ?? [],
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    onRetry: () => void query.refetch(),
  }
}

/**
 * What the next run will demand of an account.
 *
 * Read off the profile the launcher will preselect — the first one, which is the
 * protected default — because readiness is only meaningful against a specific run, and
 * that is the run the operator gets if they press START_RUN and change nothing.
 */
export function useRunRequirements(): {
  requirements: RunRequirements
  profile: BallotProfile | null
} {
  const profiles = useBallotProfiles({ pageSize: 50 })
  const mailboxes = useImapAccounts()

  const profile = profiles.data?.data?.[0] ?? null
  const imap: ImapAccount[] = mailboxes.data?.data ?? []

  return {
    profile,
    requirements: {
      requiresProxy: Boolean(profile?.proxyGroupId),
      requiresOtpMailbox: profile?.otpSource === 'imap',
      hasOtpMailbox: imap.length > 0,
    },
  }
}
