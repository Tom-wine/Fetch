'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Chip, type ChipTone } from '@/components/domain/StatusChip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { RunStatus, TaskStatus } from '@/lib/types'

/**
 * The ballot status vocabulary, in one place.
 *
 * §B7 rule 3: `RATE_LIMITED` is a code, not an explanation. Every status here has a
 * readable sentence beside it, and no sentence is ever written as `// snake_case` —
 * a run that fails has to read in plain English.
 */

interface Spec {
  tone: ChipTone
  hint: string
}

const RUN: Record<RunStatus, Spec> = {
  QUEUED: { tone: 'neutral', hint: 'Accepted and about to start.' },
  RUNNING: { tone: 'primary', hint: 'Working through the accounts now.' },
  PAUSED: { tone: 'warning', hint: 'Held. Nothing is being attempted until it resumes.' },
  COMPLETED: { tone: 'success', hint: 'Every account was attempted.' },
  STOPPED: { tone: 'neutral', hint: 'Ended early. The remaining accounts were not attempted.' },
  FAILED: { tone: 'danger', hint: 'The run itself could not continue.' },
}

const TASK: Record<TaskStatus, Spec> = {
  QUEUED: { tone: 'neutral', hint: 'Waiting for a free worker.' },
  RUNNING: { tone: 'primary', hint: 'Being entered now.' },
  RETRYING: { tone: 'warning', hint: 'The first attempt failed; this is another one.' },
  SUCCESS: { tone: 'success', hint: 'The club confirmed the ballot entry.' },
  FAILED: { tone: 'danger', hint: 'The club refused the entry. The message says why.' },
  NEEDS_OTP: { tone: 'violet', hint: 'The club asked for a code that never arrived.' },
  SKIPPED: { tone: 'neutral', hint: 'Not attempted.' },
}

export const RUN_STATUSES = Object.keys(RUN) as RunStatus[]
export const TASK_STATUSES = Object.keys(TASK) as TaskStatus[]

/** True while a run can still change on its own — what decides pinning and polling. */
export function isRunActive(status: RunStatus): boolean {
  return status === 'QUEUED' || status === 'RUNNING' || status === 'PAUSED'
}

export function runHint(status: RunStatus): string {
  return RUN[status].hint
}

export function taskHint(status: TaskStatus): string {
  return TASK[status].hint
}

function StatusChipWithHint({
  label,
  spec,
  dot = false,
  className,
}: {
  label: string
  spec: Spec
  dot?: boolean
  className?: string
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm">
            <Chip tone={spec.tone} className={className}>
              {dot && <PulseDot />}
              {label}
            </Chip>
          </span>
        </TooltipTrigger>
        {/* A plain sentence. Never `// run_failed` — §B7 rule 3. */}
        <TooltipContent className="max-w-[260px] font-prose text-prose">{spec.hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function RunStatusChip({ status, className }: { status: RunStatus; className?: string }) {
  // Statuses are chrome vocabulary, so UPPER_SNAKE is right here (§B7 rule 7).
  return (
    <StatusChipWithHint
      label={upperSnake(status)}
      spec={RUN[status]}
      dot={status === 'RUNNING'}
      className={className}
    />
  )
}

export function TaskStatusChip({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <StatusChipWithHint
      label={upperSnake(status)}
      spec={TASK[status]}
      dot={status === 'RUNNING'}
      className={className}
    />
  )
}

/**
 * The pulsing dot §B5.3 pins active runs with.
 *
 * `motion-reduce:animate-none` is not decoration: a dot pulsing at 1Hz for twenty
 * minutes is exactly the kind of thing that makes this screen unusable for someone
 * who asked the system to stop moving. The colour still says RUNNING without it.
 */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full bg-current',
        'animate-pulse motion-reduce:animate-none',
        className,
      )}
    />
  )
}

/**
 * The segmented progress bar (§B5.3), success · failed · needs-OTP · skipped ·
 * running, with everything unattempted left as track.
 *
 * Widths are percentages of the run's total, so the bar reads as "how far through"
 * rather than "how do the finished ones compare".
 */
export function RunProgress({
  counts,
  label = 'Run progress',
  className,
}: {
  /**
   * The accessible name. A `role="progressbar"` without one is an unnamed control —
   * a screen reader announces a percentage with nothing to attach it to. In a table
   * of runs each bar names its own run, so they can be told apart in a rotor list.
   */
  label?: string
  counts: {
    total: number
    queued: number
    running: number
    success: number
    failed: number
    needsOtp: number
    skipped: number
  }
  className?: string
}) {
  const total = Math.max(1, counts.total)
  const segments = [
    { key: 'success', value: counts.success, className: 'bg-success' },
    { key: 'failed', value: counts.failed, className: 'bg-danger' },
    { key: 'needsOtp', value: counts.needsOtp, className: 'bg-violet' },
    { key: 'skipped', value: counts.skipped, className: 'bg-neutral-chip' },
    { key: 'running', value: counts.running, className: 'bg-primary' },
  ].filter((segment) => segment.value > 0)

  const done = counts.success + counts.failed + counts.needsOtp + counts.skipped

  return (
    <div
      className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-border', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={counts.total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${counts.total} attempted`}
    >
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={segment.className}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

/** `04:12` under an hour, `1:04:12` over it. Used for run durations. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** `≈ 21 min` — the launcher's estimate and the run list's ETA read the same way. */
export function formatEstimate(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 90) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
