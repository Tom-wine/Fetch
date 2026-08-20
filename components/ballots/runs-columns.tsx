'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { BallotRun } from '@/lib/types'
import { PulseDot, RunProgress, RunStatusChip, formatDuration, isRunActive } from './vocabulary'

/**
 * §B5.3 — `RUN_ID · LABEL · CLUBS · PROFILE · STATUS · progress · SUCCESS/FAILED/TOTAL
 * · STARTED · DURATION · ACTIONS`.
 *
 * `RUN_ID`, the progress bar and the counts are not sortable: the first is opaque, and
 * the other two are derived from the counts rather than being fields the API can order
 * the whole history by.
 */
export function makeRunColumns({
  now,
  renderActions,
}: {
  /**
   * One timestamp for the whole render rather than `Date.now()` per cell, so every
   * duration in the table is measured from the same instant and the column does not
   * disagree with itself down the page.
   */
  now: number
  renderActions: (run: BallotRun) => React.ReactNode
}): FetchColumnDef<BallotRun>[] {
  return [
    {
      id: 'runId',
      accessorKey: 'id',
      header: 'run id',
      enableHiding: false,
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-mono text-body">
          {isRunActive(row.original.status) && (
            // The pin marker §B5.3 asks for. It is beside the id rather than replacing
            // anything, so the row reads the same whether it is moving or not.
            <PulseDot className={row.original.status === 'RUNNING' ? 'bg-primary' : 'bg-warning'} />
          )}
          <span className="truncate text-muted">{row.original.id}</span>
        </span>
      ),
    },
    {
      id: 'label',
      accessorKey: 'label',
      header: 'label',
      meta: { sortable: true },
      enableHiding: false,
      cell: ({ row }) => (
        // The label is domain data — a fixture name, a club name — and renders verbatim.
        <span className="block max-w-[240px] truncate text-body text-text">
          {row.original.label}
        </span>
      ),
    },
    {
      id: 'clubs',
      accessorKey: 'clubIds',
      header: 'clubs',
      cell: ({ row }) => (
        <span className="flex items-center gap-1">
          {row.original.clubIds.map((club) => (
            <ClubBadge key={club} club={club} variant="crest-only" size="sm" />
          ))}
        </span>
      ),
    },
    {
      id: 'profile',
      accessorKey: 'profileName',
      header: 'profile',
      meta: { sortable: true },
      cell: ({ row }) => (
        <span className="block max-w-[140px] truncate text-body text-muted">
          {row.original.profileName}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      meta: { sortable: true },
      cell: ({ row }) => <RunStatusChip status={row.original.status} />,
    },
    {
      id: 'progress',
      accessorKey: 'counts',
      header: 'progress',
      cell: ({ row }) => (
        <div className="w-[120px] min-w-[80px]">
          <RunProgress counts={row.original.counts} label={`Progress of ${row.original.label}`} />
        </div>
      ),
    },
    {
      id: 'results',
      accessorKey: 'counts',
      header: 'results',
      // `13 / 6 / 22` in three colours and no legend. Green and red carried the whole
      // meaning, which asks the reader to know the order AND see the hues — and the
      // first read of a table is where nobody knows either. The words cost 60px.
      cell: ({ row }) => {
        const { success, failed, total } = row.original.counts
        return (
          <span className="font-mono text-body whitespace-nowrap tabular-nums">
            <span className={cn(success > 0 && 'text-success-ink')}>{`${success} ok`}</span>
            <span className="text-faint"> · </span>
            <span className={cn(failed > 0 && 'text-danger-ink')}>{`${failed} failed`}</span>
            <span className="text-faint">{` · of ${total}`}</span>
          </span>
        )
      },
    },
    {
      id: 'started',
      accessorKey: 'startedAt',
      header: 'started',
      meta: { sortable: true },
      cell: ({ row }) => <RelativeTime value={row.original.startedAt} />,
    },
    {
      id: 'duration',
      accessorKey: 'startedAt',
      header: 'duration',
      cell: ({ row }) => {
        const started = Date.parse(row.original.startedAt)
        const ended = row.original.finishedAt ? Date.parse(row.original.finishedAt) : now
        return (
          <span className="font-mono text-body text-muted tabular-nums">
            {formatDuration(Math.max(0, ended - started))}
          </span>
        )
      },
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'actions',
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original)}</div>,
    },
  ]
}
