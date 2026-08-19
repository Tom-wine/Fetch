'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Chip, type ChipTone } from '@/components/domain/StatusChip'
import type { EventLevel, RunEvent } from '@/lib/types'

/**
 * One line of a log, shared by TASK_LOG and RUN_LOG so the two read identically:
 * mono timestamp · level chip · code · message · HTTP status.
 *
 * §B7 rule 3 is the whole design of this row. The code (`RATE_LIMITED`) is a label and
 * gets the chrome treatment; the message beside it is a plain sentence in prose type,
 * never `//`-prefixed, because it is the half that says what to do about it.
 */

const LEVEL_TONE: Record<EventLevel, ChipTone> = {
  info: 'neutral',
  success: 'success',
  warn: 'warning',
  error: 'danger',
}

export const EVENT_LEVELS: EventLevel[] = ['info', 'success', 'warn', 'error']

export function EventLevelChip({ level }: { level: EventLevel }) {
  return <Chip tone={LEVEL_TONE[level]}>{level.toUpperCase()}</Chip>
}

/** `14:02:31`. Seconds matter here — this is a log, not a timeline. */
export function eventClock(at: string): string {
  const date = new Date(at)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function EventRow({
  event,
  /** Highlights the row a task-scoped view is anchored on. */
  emphasis = false,
}: {
  event: RunEvent
  emphasis?: boolean
}) {
  return (
    <li
      className={cn(
        'flex min-w-0 gap-2.5 border-b border-border/50 px-3 py-2 last:border-b-0',
        emphasis && 'bg-primary/5',
      )}
    >
      <time
        dateTime={event.at}
        className="shrink-0 pt-0.5 font-mono text-caption text-faint tabular-nums"
      >
        {eventClock(event.at)}
      </time>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <EventLevelChip level={event.level} />
          <span className="font-mono text-caption font-semibold text-muted">{event.code}</span>
          {event.httpStatus !== undefined && (
            <span className="font-mono text-caption text-faint tabular-nums">
              {event.httpStatus}
            </span>
          )}
        </div>
        {/* The readable half. Prose type, plain sentence, no `//`. */}
        <p className="font-prose text-prose break-words text-text">{event.message}</p>
      </div>
    </li>
  )
}
