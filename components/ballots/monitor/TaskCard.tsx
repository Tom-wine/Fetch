'use client'

import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import type { BallotTask } from '@/lib/types'

import { TaskStatusChip } from '../vocabulary'

/**
 * One task as a card, for below `md` where an eight-column table cannot fit (§9 rule
 * 3). §B5.5 asks that "is it working" be readable on a phone, and that is this card's
 * whole job.
 *
 * DataTable's default stacked layout would list all eight fields as label/value pairs
 * — accurate and unreadable. Here the status leads, because on a phone the operator is
 * scanning for the red ones; the account names the row; the club's own sentence
 * explains it. Attempt, proxy and duration are dropped: they are for deciding what to
 * change, which is not a thing anyone does from a phone mid-on-sale.
 */
export function TaskCard({ task }: { task: BallotTask }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        {/* An email is domain data — verbatim. */}
        <span className="min-w-0 flex-1 truncate text-body font-semibold text-text">
          {task.accountEmail}
        </span>
        <TaskStatusChip status={task.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ClubBadge club={task.clubId} size="sm" />
        {task.attempt > 1 && (
          <span className="font-mono text-caption text-warning-ink tabular-nums">
            attempt {task.attempt}/{task.maxAttempts}
          </span>
        )}
        <RelativeTime value={task.updatedAt} className="text-caption text-faint" />
      </div>

      {(task.lastHttpStatus !== undefined || task.entryRef) && (
        <div className="flex items-baseline gap-1.5 font-mono text-caption">
          {task.lastHttpStatus !== undefined && (
            <span className="font-semibold text-muted tabular-nums">{task.lastHttpStatus}</span>
          )}
          {task.entryRef && <span className="truncate text-muted">{task.entryRef}</span>}
        </div>
      )}

      {/* The readable half — a plain sentence, never `//`-prefixed (§B7 rule 3). */}
      {task.lastMessage && <p className="font-prose text-caption text-muted">{task.lastMessage}</p>}
    </div>
  )
}
