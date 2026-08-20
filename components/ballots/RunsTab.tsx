'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Download, Eye, MoreVertical, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Prose } from '@/components/ui/typography'
import { DataTable } from '@/components/data/DataTable'
import { ALL, FilterSelect } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { upperSnake } from '@/lib/format/text'
import { ballotsApi } from '@/lib/api/endpoints'
import { useBallotRunsTable, useDeleteRun, useRunAction } from '@/lib/api/hooks/useBallots'
import type { BallotRun, RunStatus } from '@/lib/types'

import { NoRunsMatch, NoRunsYet } from './empty-states'
import { makeRunColumns } from './runs-columns'
import { RUN_STATUSES, isRunActive } from './vocabulary'
import { sortFieldForColumn, type BallotsUrlState } from './url-state'

/**
 * §B5.3 — `// runs`, the history.
 *
 * Active runs are pinned to the top with a pulsing dot, whatever the sort says. The
 * reason is the screen's job: the operator opens this to find the run that is still
 * moving, and burying it under fifty finished ones because it started on Tuesday is
 * the one arrangement that never helps.
 *
 * Pinning happens after the server sorts and pages, so it reorders the visible page
 * rather than pretending to reorder the history. Active runs are few and recent, so
 * they are on the first page under every sort this table offers.
 *
 * No polling here. The live monitor at /ballots/run/[id] is Part 14 and owns the
 * cadence; this list refetches when the screen is focused, which is when someone is
 * looking at it.
 */

/**
 * What ships visible: LABEL, STATUS, PROGRESS, RESULTS, STARTED, ACTIONS. What it was,
 * how it went, how far it got, and when.
 *
 * RUN_ID and PROFILE join CLUBS and DURATION behind VIEW because RESULTS grew: three
 * bare numbers became `13 ok · 6 failed · of 22`, which is 120px of new column, and the
 * table has 974px at 1280. Both are one click away and neither identifies a run to a
 * human — the id is opaque and lives in the URL, the strip and the monitor header, and
 * the profile is named on the monitor of any run you open.
 */
const HIDDEN_COLUMNS = ['runId', 'clubs', 'profile', 'duration']

export function RunsTab({
  state,
  onStartRun,
  poolEmpty,
}: {
  state: BallotsUrlState
  onStartRun: () => void
  poolEmpty: boolean
}) {
  const router = useRouter()
  const runs = useBallotRunsTable(state.runFilters)

  const action = useRunAction()
  const remove = useDeleteRun()

  const [stopping, setStopping] = React.useState<BallotRun | null>(null)
  const [deleting, setDeleting] = React.useState<BallotRun | null>(null)

  // One instant for every duration cell in this render.
  const now = React.useMemo(() => Date.now(), [runs.rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = React.useMemo(() => {
    const active = runs.rows.filter((run) => isRunActive(run.status))
    if (active.length === 0 || active.length === runs.rows.length) return runs.rows
    return [...active, ...runs.rows.filter((run) => !isRunActive(run.status))]
  }, [runs.rows])

  const renderActions = React.useCallback(
    (run: BallotRun) => (
      <RunRowActions
        run={run}
        onView={() => router.push(`/ballots/run/${run.id}`)}
        onAction={(name) => action.mutate({ id: run.id, action: name })}
        onStop={() => setStopping(run)}
        onDelete={() => setDeleting(run)}
      />
    ),
    [router, action],
  )

  const columns = React.useMemo(() => makeRunColumns({ now, renderActions }), [now, renderActions])

  const emptyHistory = !runs.loading && !runs.error && runs.total === 0 && !state.filtered

  if (emptyHistory) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <NoRunsYet onStart={onStartRun} disabled={poolEmpty} />
      </div>
    )
  }

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        noun="run"
        loading={runs.loading}
        error={runs.error}
        onRetry={runs.onRetry}
        onRowClick={(run) => router.push(`/ballots/run/${run.id}`)}
        initiallyHidden={HIDDEN_COLUMNS.filter((id) => id !== state.sortSpec?.id)}
        sorting={state.sortSpec}
        onSortingChange={(next) =>
          state.set(
            next
              ? { sort: sortFieldForColumn('runs', next.id), order: next.desc ? 'desc' : 'asc' }
              : { sort: null, order: 'desc' },
          )
        }
        pageCount={runs.query.data?.meta?.totalPages ?? 1}
        totalRows={runs.total}
        page={state.page}
        onPageChange={(page) => state.set({ page })}
        onPageSizeChange={(size) => state.set({ size, page: 1 })}
        defaultPageSize={state.size}
        empty={<NoRunsMatch onClear={state.clearFilters} />}
        toolbar={
          <Toolbar
            search={
              <ToolbarSearch
                value={state.searchInput}
                onChange={state.setSearchInput}
                placeholder="Search runs"
              />
            }
            filters={
              <>
                <FilterSelect
                  value={state.runStatus ?? ALL}
                  onChange={(value) =>
                    state.set({ runStatus: value === ALL ? null : (value as RunStatus) })
                  }
                  noun="statuses"
                  options={RUN_STATUSES.map((status) => ({
                    value: status,
                    label: upperSnake(status),
                  }))}
                />
                {state.filtered && (
                  <Button variant="ghost" size="sm" label="Clear" onClick={state.clearFilters} />
                )}
              </>
            }
            actions={
              <Button label="Start run" forward disabled={poolEmpty} onClick={onStartRun}>
                <Play aria-hidden="true" />
              </Button>
            }
          />
        }
      />

      {/*
        The profiles tab is the only screen in the app that explains itself, and it is
        the one people say is easiest to use. Same treatment here: this table pins
        moving runs to the top whatever the sort says, which is a rule the operator can
        only discover by noticing it — so it is stated, once, under the table.
      */}
      {!runs.loading && !runs.error && runs.rows.length > 0 && (
        <Prose className="text-caption text-muted">
          A run that is still moving is pinned to the top, whatever the sort says — it is the one
          you came to find. RESULTS reads as attempted: `13 ok · 6 failed · of 22` leaves three that
          were never submitted, because the run was stopped or the account was skipped.
        </Prose>
      )}

      {/* §B7 rule 6 — a stop names how much it is throwing away. */}
      <ConfirmDialog
        open={stopping !== null}
        onOpenChange={(open) => !open && setStopping(null)}
        verb="Stop"
        count={1}
        noun="run"
        title="Stop this run?"
        description={
          stopping
            ? `${stopping.counts.running + stopping.counts.queued} accounts have not been entered yet. They will be marked SKIPPED and this run cannot be restarted — only retried as a new one.`
            : ''
        }
        confirmLabel="Stop run"
        onConfirm={() => {
          if (stopping) action.mutate({ id: stopping.id, action: 'stop' })
          setStopping(null)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        verb="Delete"
        count={1}
        noun="run"
        title={deleting ? `Delete ${deleting.label}?` : 'Delete run?'}
        description={
          deleting
            ? `The record of ${deleting.counts.total} attempts and everything that was logged goes with it. This cannot be undone.`
            : ''
        }
        onConfirm={() => {
          if (deleting) remove.mutate({ id: deleting.id })
          setDeleting(null)
        }}
      />
    </>
  )
}

/**
 * §B5.3's row menu: `View · Stop (active only) · Retry failed · Export · Delete`.
 *
 * Pause and Resume are here too — a run the operator wants to hold is exactly the run
 * they are looking at in this list, and making them open the monitor first to press
 * pause costs the seconds the pause was meant to save.
 */
function RunRowActions({
  run,
  onView,
  onAction,
  onStop,
  onDelete,
}: {
  run: BallotRun
  onView: () => void
  onAction: (action: 'pause' | 'resume' | 'retry-failed') => void
  onStop: () => void
  onDelete: () => void
}) {
  const active = isRunActive(run.status)
  const hasFailures = run.counts.failed > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${run.label}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel className="font-mono text-label text-faint uppercase">
          {upperSnake('Run')}
        </DropdownMenuLabel>

        <DropdownMenuItem onSelect={onView} className="gap-2">
          <Eye className="size-4" aria-hidden="true" />
          <span>View</span>
        </DropdownMenuItem>

        {run.status === 'RUNNING' && (
          <DropdownMenuItem onSelect={() => onAction('pause')} className="gap-2">
            <Pause className="size-4" aria-hidden="true" />
            <span>Pause</span>
          </DropdownMenuItem>
        )}

        {run.status === 'PAUSED' && (
          <DropdownMenuItem onSelect={() => onAction('resume')} className="gap-2">
            <Play className="size-4" aria-hidden="true" />
            <span>Resume</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={() => onAction('retry-failed')}
          disabled={!hasFailures}
          className="gap-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          <span>{`Retry failed (${run.counts.failed})`}</span>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="gap-2">
          {/* A download, not a fetch: the endpoint returns a file rather than the
              envelope, so the browser handles it. */}
          <a href={ballotsApi.exportUrl(run.id)} download>
            <Download className="size-4" aria-hidden="true" />
            <span>Export</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {active && (
          <DropdownMenuItem onSelect={onStop} className="gap-2 text-warning-ink">
            <Square className="size-4" aria-hidden="true" />
            <span>Stop</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onSelect={onDelete}
          disabled={active}
          className="gap-2 text-danger-ink"
          title={active ? 'Stop the run before deleting it.' : undefined}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
