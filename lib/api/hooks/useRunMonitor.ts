'use client'

import * as React from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

import type { ApiError, ApiResult } from '../client'
import { ballotsApi, type TaskFilters } from '../endpoints'
import type { BallotRun, BallotTask, RunEvent, RunStatus } from '@/lib/types'
import { qk } from './keys'

/**
 * The live monitor's data layer (§B4's polling table).
 *
 * ┌───────────────────────┬─────────┬──────────────────────────────┐
 * │ resource              │ RUNNING │ terminal                     │
 * ├───────────────────────┼─────────┼──────────────────────────────┤
 * │ /runs/:id             │ 2000 ms │ stop                         │
 * │ /runs/:id/tasks       │ 3000 ms │ one last call, then stop     │
 * │ /runs/:id/events      │ 1000 ms │ one last call, then stop     │
 * └───────────────────────┴─────────┴──────────────────────────────┘
 *
 * §B7 rule 4: NO INTERVAL SURVIVES A TERMINAL STATUS OR AN UNMOUNT. Every interval
 * here is a `refetchInterval` returning `false`, which TanStack owns — it is torn down
 * with the query observer when the screen unmounts. There is not one `setInterval` in
 * this file, and there must never be: a hand-rolled timer is the leak that is easiest
 * to write and hardest to see, because a finished run looks exactly right while it
 * quietly hammers the API from a screen nobody is on.
 *
 * PAUSED is NOT terminal. A paused run's counters are frozen, but the operator can
 * resume it from another tab or another machine, and a monitor that had stopped
 * polling would sit there showing PAUSED over a run that is moving again.
 */

const RUN_MS = 2_000
const TASKS_MS = 3_000
const EVENTS_MS = 1_000

/** COMPLETED · STOPPED · FAILED. The run cannot change again on its own. */
export function isTerminal(status: RunStatus | undefined): boolean {
  return status === 'COMPLETED' || status === 'STOPPED' || status === 'FAILED'
}

/* --------------------------------------------------------------------- run */

/**
 * `GET /ballots/runs/:id` every 2s.
 *
 * This one needs no final call: the response that first reports a terminal status IS
 * the last call, and `refetchInterval` is re-evaluated against it.
 */
export function useMonitoredRun(id: string) {
  return useQuery<ApiResult<BallotRun>, ApiError>({
    queryKey: qk.ballots.runs.detail(id),
    queryFn: () => ballotsApi.run(id),
    refetchInterval: (query) => (isTerminal(query.state.data?.data.status) ? false : RUN_MS),
    // A run advances on the server's clock, so anything cached is already behind.
    staleTime: 0,
    // The default backs off to 30s across three tries, which on a screen polling at
    // 2s means half a minute of a stale header after one blip. One quick retry, then
    // the error state, which has its own visible Retry.
    retry: 1,
  })
}

/* ------------------------------------------------------------------- tasks */

/**
 * `GET /ballots/runs/:id/tasks` every 3s, then once more.
 *
 * The extra call matters: the run query is what discovers the run went terminal, and
 * without a final tasks fetch the table would freeze one poll short — showing 47
 * accounts still QUEUED on a run that has just marked them all SKIPPED.
 */
export function useMonitoredTasks(
  id: string,
  filters: TaskFilters,
  status: RunStatus | undefined,
): UseQueryResult<ApiResult<BallotTask[]>, ApiError> {
  const terminal = isTerminal(status)
  const terminalRef = React.useRef(terminal)
  terminalRef.current = terminal

  const finalDone = React.useRef(false)
  // A resumed run starts moving again, so the "we already did the last call" latch
  // has to be released or the table would stay frozen for the rest of the run.
  if (!terminal) finalDone.current = false

  /*
   * The refs this query reads are deliberately NOT in its key. The key identifies the
   * RESOURCE; the refs track where THIS MOUNT has read up to. Putting the cursor in the
   * key would mint a fresh cache entry on every tick and the log would restart from
   * empty once a second — the exact bug the cursor exists to prevent.
   */
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery<ApiResult<BallotTask[]>, ApiError>({
    queryKey: qk.ballots.runs.tasks(id, filters),
    queryFn: async () => {
      const result = await ballotsApi.tasks(id, filters)
      if (terminalRef.current) finalDone.current = true
      return result
    },
    refetchInterval: () => (terminalRef.current && finalDone.current ? false : TASKS_MS),
    placeholderData: (previous) => previous,
    staleTime: 0,
    retry: 1,
  })
}

/* ------------------------------------------------------------------ events */

export interface EventFeed {
  events: RunEvent[]
  lastSeq: number
  loading: boolean
  error: string | null
  onRetry: () => void
}

/**
 * `GET /ballots/runs/:id/events?since=<seq>` every 1s, then once more.
 *
 * THE CURSOR. `since` is the `meta.lastSeq` of the previous response, and the endpoint
 * guarantees `seq > since` — so what comes back is appended and NOTHING IS EVER
 * DEDUPLICATED HERE (§B7 rule 5). If a duplicate ever reaches the screen the server
 * broke its contract, and quietly filtering it here would hide that.
 *
 * The accumulated list lives in a ref rather than in the query cache entry, because
 * the cache is keyed by run id alone and the cursor is a property of THIS mount. A
 * reload starts from `since=0` and replays the whole run, which is why the events are
 * kept server-side rather than trimmed.
 */
export function useRunEvents(id: string, status: RunStatus | undefined): EventFeed {
  const terminal = isTerminal(status)
  const terminalRef = React.useRef(terminal)
  terminalRef.current = terminal

  const finalDone = React.useRef(false)
  if (!terminal) finalDone.current = false

  const cursor = React.useRef(0)
  const buffer = React.useRef<RunEvent[]>([])

  // Switching runs without unmounting — the id is a route param — has to reset both,
  // or run B's log opens holding run A's lines at run A's cursor.
  const seenId = React.useRef(id)
  if (seenId.current !== id) {
    seenId.current = id
    cursor.current = 0
    buffer.current = []
    finalDone.current = false
  }

  /*
   * The refs this query reads are deliberately NOT in its key. The key identifies the
   * RESOURCE; the refs track where THIS MOUNT has read up to. Putting the cursor in the
   * key would mint a fresh cache entry on every tick and the log would restart from
   * empty once a second — the exact bug the cursor exists to prevent.
   */
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const query = useQuery<RunEvent[], ApiError>({
    queryKey: qk.ballots.runs.events(id),
    queryFn: async () => {
      const result = await ballotsApi.events(id, cursor.current)

      // The cursor only ever moves forward. `lastSeq` is the seq of the last event in
      // THIS response, so a truncated page resumes exactly where it stopped.
      cursor.current = result.meta?.lastSeq ?? cursor.current
      if (result.data.length > 0) buffer.current = [...buffer.current, ...result.data]

      if (terminalRef.current) finalDone.current = true
      return buffer.current
    },
    refetchInterval: () => (terminalRef.current && finalDone.current ? false : EVENTS_MS),
    staleTime: 0,
    retry: 1,
  })

  return {
    events: query.data ?? buffer.current,
    lastSeq: cursor.current,
    loading: query.isPending,
    error: query.error ? query.error.message : null,
    onRetry: () => void query.refetch(),
  }
}

/* ----------------------------------------------------------------- summary */

/** The server clamps `pageSize` at 200 (lib/mock/http.ts), and so will a real API. */
const MAX_PAGE_SIZE = 200
const SUMMARY_MS = 5_000

/**
 * Every task in the run, unfiltered — what `SUMMARY` counts.
 *
 * This is NOT a fourth always-on poll. It is the tasks resource read a second way, and
 * it only runs while the SUMMARY tab is actually open: `enabled` is false on the other
 * two, so opening the monitor on the log costs nothing. It also ticks at 5s rather than
 * the table's 3s, because a distribution does not need to be fresh to the second the
 * way a row does.
 *
 * The table's own query cannot answer this. It holds ONE PAGE of a set the operator has
 * filtered — counting error codes from it would report the distribution of whatever
 * happens to be on screen and call it the run's.
 */
export function useRunSummaryTasks(
  id: string,
  status: RunStatus | undefined,
  enabled: boolean,
): UseQueryResult<BallotTask[], ApiError> {
  const terminal = isTerminal(status)
  const terminalRef = React.useRef(terminal)
  terminalRef.current = terminal

  const finalDone = React.useRef(false)
  if (!terminal) finalDone.current = false

  /*
   * The refs this query reads are deliberately NOT in its key. The key identifies the
   * RESOURCE; the refs track where THIS MOUNT has read up to. Putting the cursor in the
   * key would mint a fresh cache entry on every tick and the log would restart from
   * empty once a second — the exact bug the cursor exists to prevent.
   */
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  return useQuery<BallotTask[], ApiError>({
    queryKey: [...qk.ballots.runs.detail(id), 'summary'],
    queryFn: async () => {
      const first = await ballotsApi.tasks(id, { page: 1, pageSize: MAX_PAGE_SIZE })
      const rows = [...first.data]
      const totalPages = first.meta?.totalPages ?? 1

      for (let page = 2; page <= totalPages; page++) {
        const next = await ballotsApi.tasks(id, { page, pageSize: MAX_PAGE_SIZE })
        rows.push(...next.data)
      }

      if (terminalRef.current) finalDone.current = true
      return rows
    },
    enabled,
    refetchInterval: () => (terminalRef.current && finalDone.current ? false : SUMMARY_MS),
    placeholderData: (previous) => previous,
    staleTime: 0,
    retry: 1,
  })
}

/* ---------------------------------------------------------------- controls */

/**
 * Everything the monitor's own actions need to invalidate.
 *
 * A pause or a stop changes the run, its tasks and its events all at once, and the
 * next scheduled poll could be nearly three seconds away — long enough for the button
 * to look broken. This forces all three immediately.
 */
export function useRefreshMonitor(id: string) {
  const queryClient = useQueryClient()

  return React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: qk.ballots.runs.detail(id) })
    void queryClient.invalidateQueries({ queryKey: qk.ballots.runs.all })
  }, [queryClient, id])
}
