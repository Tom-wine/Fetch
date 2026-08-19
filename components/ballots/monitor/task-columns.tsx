'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { BallotTask } from '@/lib/types'

import { TaskStatusChip } from '../vocabulary'

/**
 * §B5.5's task table — `ACCOUNT · CLUB · STATUS · ATTEMPT · LAST_RESPONSE · PROXY ·
 * DURATION · UPDATED`.
 *
 * LAST_RESPONSE is the column this screen exists for. §B7 rule 3: `429` on its own is
 * a number and `RATE_LIMITED` on its own is a code — neither explains anything to
 * someone deciding whether to lower the concurrency. The engine attaches a readable
 * sentence to every outcome and it is shown here, in the row, not behind a hover.
 *
 * PROXY is not sortable — the API can only order by the stored label, and a run where
 * every task shares a group would reorder into something the column does not explain.
 */
export function taskColumns(): FetchColumnDef<BallotTask>[] {
  return [
    {
      id: 'account',
      accessorKey: 'accountEmail',
      header: 'account',
      meta: { sortable: true },
      enableHiding: false,
      cell: ({ row }) => (
        // An email is domain data and the widest thing in the table — capped, not
        // fluid, or it pushes UPDATED off the right edge of a 64%-wide pane.
        <span className="block max-w-[190px] truncate text-body text-text">
          {row.original.accountEmail}
        </span>
      ),
    },
    {
      id: 'club',
      accessorKey: 'clubId',
      header: 'club',
      meta: { sortable: true },
      cell: ({ row }) => <ClubBadge club={row.original.clubId} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      meta: { sortable: true },
      enableHiding: false,
      cell: ({ row }) => <TaskStatusChip status={row.original.status} />,
    },
    {
      id: 'attempt',
      accessorKey: 'attempt',
      header: 'attempt',
      meta: { sortable: true },
      cell: ({ row }) => {
        const { attempt, maxAttempts } = row.original
        return (
          <span className="font-mono text-body tabular-nums">
            {/* A second attempt is a real event, so it reads differently from a first. */}
            <span className={cn(attempt > 1 ? 'text-warning-ink' : 'text-muted')}>{attempt}</span>
            <span className="text-faint">/{maxAttempts}</span>
          </span>
        )
      },
    },
    {
      id: 'response',
      accessorKey: 'lastMessage',
      header: 'last response',
      cell: ({ row }) => <ResponseCell task={row.original} />,
    },
    {
      id: 'proxy',
      accessorKey: 'proxyLabel',
      header: 'proxy',
      cell: ({ row }) =>
        row.original.proxyLabel ? (
          <span className="block max-w-[130px] truncate font-mono text-caption text-muted">
            {row.original.proxyLabel}
          </span>
        ) : (
          <span className="text-faint">direct</span>
        ),
    },
    {
      id: 'duration',
      accessorKey: 'durationMs',
      header: 'duration',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.durationMs !== undefined ? (
          <span className="font-mono text-body text-muted tabular-nums">
            {(row.original.durationMs / 1000).toFixed(1)}s
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      id: 'updated',
      accessorKey: 'updatedAt',
      header: 'updated',
      meta: { sortable: true },
      cell: ({ row }) => <RelativeTime value={row.original.updatedAt} />,
    },
  ]
}

const HTTP_TONE: Record<string, string> = {
  '2': 'text-success-ink',
  '4': 'text-warning-ink',
  '5': 'text-danger-ink',
}

function ResponseCell({ task }: { task: BallotTask }) {
  if (task.lastHttpStatus === undefined && !task.lastMessage) {
    return <span className="text-faint">—</span>
  }

  const tone = task.lastHttpStatus
    ? (HTTP_TONE[String(task.lastHttpStatus)[0]!] ?? 'text-muted')
    : 'text-muted'

  return (
    <div className="flex max-w-[280px] min-w-0 flex-col gap-0.5">
      <span className="flex items-baseline gap-1.5">
        {task.lastHttpStatus !== undefined && (
          <span className={cn('font-mono text-body font-semibold tabular-nums', tone)}>
            {task.lastHttpStatus}
          </span>
        )}
        {task.entryRef && (
          <span className="truncate font-mono text-caption text-muted">{task.entryRef}</span>
        )}
      </span>
      {/* A plain sentence. The code is a label; this is the explanation (§B7 rule 3). */}
      {task.lastMessage && (
        <span className="line-clamp-2 font-prose text-caption text-muted">{task.lastMessage}</span>
      )}
    </div>
  )
}

/** Dropped first at ~840px of pane, where all eight columns stop fitting. */
export const INITIALLY_HIDDEN = ['proxy', 'duration']
