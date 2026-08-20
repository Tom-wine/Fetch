'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Hourglass, SearchX } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState, ErrorState } from '@/components/data/states'
import { ALL, FilterSelect } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { Skeleton } from '@/components/ui/skeleton'
import { upperSnake } from '@/lib/format/text'
import { LG, useMediaQuery } from '@/lib/use-media-query'
import { useRunAction } from '@/lib/api/hooks/useBallots'
import {
  isTerminal,
  useMonitoredRun,
  useMonitoredTasks,
  useRunEvents,
  useRunSummaryTasks,
} from '@/lib/api/hooks/useRunMonitor'
import type { RunAction } from '@/lib/api/endpoints'
import type { BallotClubId, BallotTask, TaskStatus } from '@/lib/types'
import { getClub } from '@/lib/registries/clubs'

import { TASK_STATUSES } from '../vocabulary'
import { MonitorPanel } from './MonitorPanel'
import { RunHeader, RunHeaderSkeleton } from './RunHeader'
import { StatsBand, StatsBandSkeleton } from './StatsBand'
import { TaskCard } from './TaskCard'
import { INITIALLY_HIDDEN, taskColumns } from './task-columns'
import { sortFieldForColumn, useMonitorUrlState } from './url-state'

/**
 * `/ballots/run/[id]` — §B5.5, the screen an operator watches for twenty minutes.
 *
 * Two panes at 1280px and up, the task table at ~62% and the panel at ~38%; below that
 * the panel stacks under the table at full width rather than being squeezed (§9 rule
 * 2). The switch is `useMediaQuery`, not `xl:hidden`, for the same reason the profile
 * form needed it: at narrow widths the panel is a stacked card and at wide widths it
 * is a grid column, and rendering both and hiding one means paying for both.
 *
 * Everything the operator is LOOKING AT is in the URL — the status filter the stats
 * band writes, the club, the search, the sort, the page, the panel tab, the log level.
 * The SELECTED TASK is not: it changes on every click, and a history entry per click
 * would bury the page they came from.
 *
 * Polling lives entirely in lib/api/hooks/useRunMonitor.ts. Nothing on this screen owns
 * a timer except the header's elapsed clock, which stops when the run does.
 */
export function RunMonitorScreen() {
  // Read here rather than awaited in the page: see the note in that route file. An
  // `await params` in the page suspends the server render and renumbers every `useId`
  // above this screen; `useParams` is synchronous on both renders.
  const { id: runId } = useParams<{ id: string }>()
  const router = useRouter()
  const url = useMonitorUrlState()
  const wide = useMediaQuery(LG)

  const runQuery = useMonitoredRun(runId)
  const run = runQuery.data?.data ?? null
  const status = run?.status

  const tasksQuery = useMonitoredTasks(runId, url.filters, status)
  const tasks = tasksQuery.data?.data ?? []
  const meta = tasksQuery.data?.meta ?? null

  const feed = useRunEvents(runId, status)

  // Only while the tab is open — see the hook for why this is not a fourth poll.
  const summaryQuery = useRunSummaryTasks(runId, status, url.panel === 'summary')

  /* ------------------------------------------------------------ selection */

  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  // The selected task is re-read from the LIVE rows every render rather than held as
  // an object, so the panel follows the task as it moves QUEUED → RUNNING → SUCCESS
  // instead of freezing on whatever it was when the row was clicked.
  const selectedTask: BallotTask | null =
    tasks.find((task) => task.id === selectedId) ??
    summaryQuery.data?.find((task) => task.id === selectedId) ??
    null

  // A task that has been filtered off the page is no longer selectable, but the panel
  // keeps showing it: it is still the task the operator asked about, and clearing the
  // selection because a poll reordered the table would be the screen losing their
  // place on its own.
  const setPanel = url.set
  const onRowClick = React.useCallback(
    (task: BallotTask) => {
      setSelectedId(task.id)
      // Opening a task moves the panel to its timeline — that is what the click meant.
      // The tab strip is right there to go back to the tail.
      setPanel({ panel: 'task' })
    },
    [setPanel],
  )

  /* ------------------------------------------------------------- controls */

  const action = useRunAction()
  const [pending, setPending] = React.useState<RunAction | null>(null)

  const runAction = React.useCallback(
    (name: RunAction) => {
      setPending(name)
      action.mutate(
        { id: runId, action: name },
        {
          onSuccess: (result) => {
            // retry-failed returns a DIFFERENT run — the new one — so the monitor
            // follows it. The original stays intact as the record of what happened.
            if (name === 'retry-failed' && result.data.id !== runId) {
              router.push(`/ballots/run/${result.data.id}`)
            }
          },
          onSettled: () => setPending(null),
        },
      )
    },
    [action, runId, router],
  )

  const columns = React.useMemo(() => taskColumns(), [])

  /* ---------------------------------------------------------- run states */

  if (runQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <RunHeaderSkeleton />
        <StatsBandSkeleton />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
          <Skeleton className="h-[420px] w-full rounded-lg" />
          <Skeleton className="hidden h-[420px] w-full rounded-lg xl:block" />
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState
            title="Run not found"
            message={
              runQuery.error?.message ??
              'That run is not in the history. It may have been deleted since the link was made.'
            }
            onRetry={() => void runQuery.refetch()}
          />
          <div className="flex justify-center pb-8">
            <Link href="/ballots?tab=runs" className={buttonVariants({ variant: 'secondary' })}>
              <span>BACK_TO_RUNS</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------- content */

  // Two empty states, because they need two different next actions: filters that
  // matched nothing are fixed by clearing them, a run with no task yet is fixed by
  // waiting.
  const empty = url.filtered ? (
    <EmptyState
      icon={SearchX}
      title="No task matches"
      body="Nothing in this run matches these filters. Clear them to see every account."
      action={<Button variant="secondary" label="Clear filters" onClick={url.clearFilters} />}
      glyph="brackets"
    />
  ) : (
    <EmptyState
      icon={Hourglass}
      title="No tasks yet"
      body="This run has been accepted and is about to start. Its accounts appear here the moment the first worker picks one up."
      glyph="prompt"
    />
  )

  const table = (
    <DataTable
      data={tasks}
      columns={columns}
      getRowId={(task) => task.id}
      noun="task"
      // The placeholder keeps the previous page on screen across a poll, so `loading`
      // is only ever true on the very first fetch. Without that this table would
      // flash its skeleton every three seconds.
      loading={tasksQuery.isPending}
      error={tasksQuery.error ? tasksQuery.error.message : null}
      onRetry={() => void tasksQuery.refetch()}
      empty={empty}
      onRowClick={onRowClick}
      initiallyHidden={INITIALLY_HIDDEN}
      sorting={url.sortSpec}
      onSortingChange={(next) =>
        url.set(
          next
            ? { sort: sortFieldForColumn(next.id), order: next.desc ? 'desc' : 'asc' }
            : { sort: null, order: 'desc' },
        )
      }
      pageCount={meta?.totalPages ?? 1}
      totalRows={meta?.total ?? tasks.length}
      page={url.page}
      onPageChange={(page) => url.set({ page })}
      pageSize={url.size}
      onPageSizeChange={(size) => url.set({ size, page: 1 })}
      renderCard={(task) => <TaskCard task={task} />}
      toolbar={
        <Toolbar
          search={
            <ToolbarSearch
              value={url.searchInput}
              onChange={url.setSearchInput}
              placeholder="Search by email"
            />
          }
          filters={
            <>
              <FilterSelect
                value={url.status ?? ALL}
                onChange={(value) =>
                  url.set({ status: value === ALL ? null : (value as TaskStatus) })
                }
                noun="statuses"
                options={TASK_STATUSES.map((entry) => ({
                  value: entry,
                  label: upperSnake(entry),
                }))}
              />
              <FilterSelect
                value={url.club ?? ALL}
                onChange={(value) =>
                  url.set({ club: value === ALL ? null : (value as BallotClubId) })
                }
                noun="clubs"
                // Only the clubs this run actually covers. Offering the other six
                // would be offering six filters that can only return nothing.
                options={run.clubIds.map((club) => ({
                  value: club,
                  label: getClub(club).short,
                }))}
              />
              {url.filtered && (
                <Button variant="ghost" size="sm" label="Clear" onClick={url.clearFilters} />
              )}
            </>
          }
        />
      }
    />
  )

  const panel = (
    <MonitorPanel
      runId={runId}
      tab={url.panel}
      onTabChange={(tab) => url.set({ panel: tab })}
      selectedTask={selectedTask}
      feed={feed}
      level={url.level}
      onLevelChange={(level) => url.set({ level })}
      summaryTasks={summaryQuery.data ?? []}
      summaryLoading={summaryQuery.isPending}
      summaryError={summaryQuery.error ? summaryQuery.error.message : null}
      onSummaryRetry={() => void summaryQuery.refetch()}
      /*
       * The panel needs a DEFINITE height or the log cannot scroll inside it — with
       * only `min-h` it grows to fit every line and the whole page scrolls instead,
       * which puts the newest line below the fold and makes the auto-scroll rule
       * meaningless.
       *
       * Wide: sticky under the topbar at full remaining height, so the tail stays in
       * view while the task table scrolls past it. `top-16` clears the 3.5rem topbar
       * — the shell's <main> is the scrollport and its own padding does not count
       * toward `top`, so a smaller value slides the panel under the search pill.
       *
       * Narrow: a fixed 560px card. Not viewport-relative, because stacked under the
       * table the panel starts well below the fold and `100vh` would run off it.
       */
      className={wide ? 'xl:sticky xl:top-16 xl:h-[calc(100vh-6.5rem)]' : 'h-[560px]'}
    />
  )

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <RunHeader
        run={run}
        pending={pending}
        onAction={(name) => runAction(name)}
        onStop={() => runAction('stop')}
      />

      <StatsBand
        run={run}
        status={url.status}
        onStatusChange={(next) => url.set({ status: next })}
      />

      {/*
        62 / 38 from 1280px, one column below it. `minmax(0, …)` on both tracks is what
        stops the table from pushing the panel off the grid — a bare `fr` track refuses
        to shrink below its content, which clips the panel, which is exactly the
        failure §9 rule 2 exists to prevent.
      */}
      {wide ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
          <div data-tour="run-table" className="min-w-0">
            {table}
          </div>
          {panel}
        </div>
      ) : (
        <div className="space-y-4">
          <div data-tour="run-table">{table}</div>
          {panel}
        </div>
      )}

      {isTerminal(status) && <TerminalNotice />}
    </div>
  )
}

/**
 * A finished run says so once, in words, rather than leaving the operator to infer it
 * from a progress bar that stopped moving. `role="status"` so a screen reader hears it
 * when the run ends.
 */
function TerminalNotice() {
  return (
    <p
      role="status"
      className="rounded-md border border-border bg-surface px-4 py-2.5 text-center font-mono text-caption text-faint"
    >
      {'// this run has finished · live updates stopped'}
    </p>
  )
}
