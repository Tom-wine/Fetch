'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Skeleton } from '@/components/ui/skeleton'
import type { BallotRun, TaskStatus } from '@/lib/types'

import { RunProgress, formatEstimate, taskHint } from '../vocabulary'

/**
 * §B5.5's stats band.
 *
 * Seven counters that FILTER THE TABLE, plus RATE and ETA, over one progress bar
 * segmented by outcome. One bar that says everything: green success, red failed, amber
 * OTP, neutral pending — so "is it working" is answerable from across the room, which
 * is the actual use of this screen.
 *
 * The counters are buttons, not decoration. Clicking FAILED filters the table to the
 * failures, and clicking it again clears — a toggle rather than a one-way trip,
 * because the way out of a filter has to be the control that set it. TOTAL is the
 * clear-all, which is why it is the one that reads active when nothing is filtered.
 *
 * Under `sm` it is still two columns, but it LEADS WITH SUCCESS AND FAILED and folds
 * the other five into single lines beneath them. Seven equal-weight cells at two per row
 * filled a phone screen on their own, which pushed the first failed task below the fold
 * — and "is it working" is exactly the question a phone is holding this screen open to
 * answer. The order only changes below `sm`; from `sm` up TOTAL leads, because there it
 * is the clear-all at the head of a row that fits.
 */

interface Counter {
  /** null is TOTAL — the one that clears the filter rather than setting one. */
  status: TaskStatus | null
  label: string
  value: number
  tone: string
  /** Answers "is it working", so it keeps its full size on a phone. */
  lead?: boolean
  /** Where it sits below `sm`. Static strings — Tailwind reads these literally. */
  smallOrder: string
}

export function StatsBand({
  run,
  status,
  onStatusChange,
  className,
}: {
  run: BallotRun
  /** The status the table is filtered to, from the URL. */
  status: TaskStatus | null
  onStatusChange: (status: TaskStatus | null) => void
  className?: string
}) {
  const c = run.counts

  const counters: Counter[] = [
    {
      status: null,
      label: 'Total',
      value: c.total,
      tone: 'text-text',
      smallOrder: 'max-sm:order-3',
    },
    {
      status: 'QUEUED',
      label: 'Queued',
      value: c.queued,
      tone: 'text-muted',
      smallOrder: 'max-sm:order-5',
    },
    {
      status: 'RUNNING',
      label: 'Running',
      value: c.running,
      tone: 'text-primary-ink',
      smallOrder: 'max-sm:order-4',
    },
    {
      status: 'SUCCESS',
      label: 'Success',
      value: c.success,
      tone: 'text-success-ink',
      lead: true,
      smallOrder: 'max-sm:order-1',
    },
    {
      status: 'FAILED',
      label: 'Failed',
      value: c.failed,
      tone: 'text-danger-ink',
      lead: true,
      smallOrder: 'max-sm:order-2',
    },
    {
      status: 'NEEDS_OTP',
      label: 'Needs OTP',
      value: c.needsOtp,
      tone: 'text-violet-ink',
      smallOrder: 'max-sm:order-6',
    },
    {
      status: 'SKIPPED',
      label: 'Skipped',
      value: c.skipped,
      tone: 'text-muted',
      smallOrder: 'max-sm:order-7',
    },
  ]

  const done = c.success + c.failed + c.needsOtp + c.skipped
  const percent = c.total > 0 ? Math.round((done / c.total) * 100) : 0

  return (
    <section
      aria-label="Run progress"
      className={cn('rounded-lg border border-border bg-surface p-4 sm:p-5', className)}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:grid-cols-7">
        {counters.map((counter) => (
          <CounterButton
            key={counter.label}
            counter={counter}
            active={counter.status === status}
            onSelect={() =>
              onStatusChange(
                counter.status === null || counter.status === status ? null : counter.status,
              )
            }
          />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <RunProgress counts={c} className="h-2" />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-caption tabular-nums">
          <span className="text-muted">
            <span className="text-text">{done}</span>
            <span className="text-faint"> of {c.total} attempted</span>
            <span className="text-faint"> · {percent}%</span>
          </span>

          <span className="flex items-center gap-4">
            <span className="text-muted">
              <span className="text-faint">rate </span>
              {/* A run that has not attempted anything yet has no rate — an em dash
                  rather than 0/min, which would read as "stalled". */}
              {run.ratePerMin > 0 ? `${run.ratePerMin}/min` : <span className="text-faint">—</span>}
            </span>
            <span className="text-muted">
              <span className="text-faint">eta </span>
              {run.etaSeconds !== undefined ? (
                formatEstimate(run.etaSeconds)
              ) : (
                <span className="text-faint">—</span>
              )}
            </span>
          </span>
        </div>
      </div>
    </section>
  )
}

function CounterButton({
  counter,
  active,
  onSelect,
}: {
  counter: Counter
  active: boolean
  onSelect: () => void
}) {
  const empty = counter.value === 0 && counter.status !== null

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      // Nothing to filter to, so nothing to click. Still rendered, because a counter
      // that disappears at zero makes the band reflow every few seconds.
      disabled={empty}
      title={counter.status ? taskHint(counter.status) : 'Every account in this run.'}
      className={cn(
        'flex min-w-0 flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left transition-colors duration-150',
        counter.smallOrder,
        // The folded five: label and value on one line, at body size, below `sm`.
        !counter.lead && 'max-sm:flex-row max-sm:items-baseline max-sm:gap-2 max-sm:py-1',
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-transparent hover:border-border hover:bg-surface-hover',
        empty && 'cursor-default opacity-45 hover:border-transparent hover:bg-transparent',
      )}
    >
      <span className="truncate font-mono text-label text-faint uppercase">
        {upperSnake(counter.label)}
      </span>
      <span
        className={cn(
          'font-mono text-h2 leading-none font-bold tabular-nums',
          !counter.lead && 'max-sm:text-body',
          counter.tone,
        )}
      >
        {counter.value}
      </span>
    </button>
  )
}

export function StatsBandSkeleton() {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="space-y-1.5 px-2.5 py-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-6 w-10" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
    </section>
  )
}
