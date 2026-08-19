'use client'

import * as React from 'react'
import { MousePointerClick } from 'lucide-react'

import { EmptyState } from '@/components/data/states'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { SectionLabel } from '@/components/ui/typography'
import type { BallotTask, RunEvent } from '@/lib/types'

import { TaskStatusChip } from '../vocabulary'
import { EventRow } from './event-row'

/**
 * `TASK_LOG` — one account's timeline (§B5.5).
 *
 * Filtered from the run's own event feed rather than fetched separately: the feed is
 * already in memory, already complete back to `since=0`, and a per-task endpoint would
 * be a second request per row click on a screen already polling three resources.
 *
 * The header repeats the account, club, status and attempt because the table row that
 * was clicked scrolls away, and a panel that only makes sense next to a row you can no
 * longer see is a panel you have to keep checking.
 */
export function TaskLogTab({
  task,
  events,
}: {
  task: BallotTask | null
  /** The whole run feed. Filtered here. */
  events: RunEvent[]
}) {
  const timeline = React.useMemo(
    () =>
      task ? events.filter((event) => event.taskId === task.id).sort((a, b) => a.seq - b.seq) : [],
    [events, task],
  )

  if (!task) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="No task selected"
        body="Select a task in the table to see everything that happened to that account, in order."
        glyph="none"
        className="min-h-[220px]"
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 space-y-2 border-b border-border px-3 py-3">
        {/* An email is domain data — verbatim. */}
        <p className="truncate text-body font-semibold text-text">{task.accountEmail}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ClubBadge club={task.clubId} size="sm" />
          <TaskStatusChip status={task.status} />
          <span className="font-mono text-caption text-muted tabular-nums">
            <span className="text-faint">attempt </span>
            {task.attempt}/{task.maxAttempts}
          </span>
          {task.durationMs !== undefined && (
            <span className="font-mono text-caption text-muted tabular-nums">
              <span className="text-faint">took </span>
              {(task.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {task.proxyLabel && (
          <p className="truncate font-mono text-caption text-faint">via {task.proxyLabel}</p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {timeline.length === 0 ? (
          <div className="px-3 py-6">
            <SectionLabel>waiting</SectionLabel>
            <p className="mt-1.5 font-prose text-prose text-muted">
              This account has not been attempted yet. Its first line appears here the moment a
              worker picks it up.
            </p>
          </div>
        ) : (
          <ul>
            {timeline.map((event) => (
              <EventRow key={`${event.runId}:${event.seq}`} event={event} emphasis />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-1.5 font-mono text-caption text-faint tabular-nums">
        {`// ${timeline.length} ${timeline.length === 1 ? 'event' : 'events'}`}
      </div>
    </div>
  )
}
