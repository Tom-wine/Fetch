'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, Copy, Download, Loader2, Pause, Play, RotateCcw, Square } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Display } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatDateTime } from '@/lib/format/date'
import { ballotsApi, type RunAction } from '@/lib/api/endpoints'
import type { BallotRun } from '@/lib/types'

import { RunStatusChip, formatDuration } from '../vocabulary'

/**
 * §B5.5's header.
 *
 * `Ballots / run_7f3a…` · the run's label as the h1 · RUN_ID in mono with copy · club
 * crests · the profile, linked · the status chip · `started · elapsed` · and the four
 * actions on the right.
 *
 * ELAPSED ticks locally at 1Hz rather than waiting for the 2s run poll. It is derived
 * from `startedAt` and the server's own `finishedAt`, so it is not a second clock that
 * can disagree with the run — it is the same arithmetic, drawn more often. Frozen the
 * moment the run stops moving, which is what makes a finished run render identically.
 */
export function RunHeader({
  run,
  onAction,
  onStop,
  pending,
}: {
  run: BallotRun
  onAction: (action: Exclude<RunAction, 'stop'>) => void
  onStop: () => void
  pending: RunAction | null
}) {
  const { settings } = useLocale()
  const [confirmingStop, setConfirmingStop] = React.useState(false)

  const inFlight = run.counts.running + run.counts.queued
  const canPause = run.status === 'RUNNING'
  const canResume = run.status === 'PAUSED'
  const canStop = run.status === 'RUNNING' || run.status === 'PAUSED' || run.status === 'QUEUED'

  return (
    <header className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-caption text-faint">
          <li>
            <Link href="/ballots?tab=runs" className="transition-colors hover:text-text">
              Ballots
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span className="text-muted">{truncateId(run.id)}</span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {/* The label is domain data — a fixture, a club, whatever the operator
              typed. Verbatim, never snake_cased (§B7 rule 7).

              Clamped to two lines, and smaller under `sm`. A long label at 28px
              uppercase took FOUR lines on a 375px screen, and with the stats band under
              it the first failed task was two scrolls down — on the screen whose whole
              job is answering "is it working" at a glance. The full label is on the
              element, so nothing is lost to the clamp. */}
          <Display
            as="h1"
            size="h1"
            verbatim
            title={run.label}
            className="line-clamp-2 text-text max-sm:text-[20px]"
          >
            {run.label}
          </Display>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <RunIdCopy id={run.id} />

            <span className="flex items-center gap-1">
              {run.clubIds.map((club) => (
                <ClubBadge key={club} club={club} variant="crest-only" size="sm" />
              ))}
            </span>

            <Link
              href="/ballots?tab=profiles"
              className="text-body text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
            >
              {run.profileName}
            </Link>

            <RunStatusChip status={run.status} />

            <Elapsed run={run} startedLabel={formatDateTime(run.startedAt, settings)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canPause && (
            <Button
              variant="secondary"
              label="Pause"
              disabled={pending !== null}
              onClick={() => onAction('pause')}
            >
              {pending === 'pause' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
            </Button>
          )}

          {canResume && (
            <Button label="Resume" disabled={pending !== null} onClick={() => onAction('resume')}>
              {pending === 'resume' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play aria-hidden="true" />
              )}
            </Button>
          )}

          {canStop && (
            <Button
              variant="warning"
              label="Stop"
              disabled={pending !== null}
              onClick={() => setConfirmingStop(true)}
            >
              <Square aria-hidden="true" />
            </Button>
          )}

          <Button
            variant="secondary"
            label="Retry failed"
            count={run.counts.failed}
            disabled={run.counts.failed === 0 || pending !== null}
            // Disabled with a reason attached, not silently inert.
            title={run.counts.failed === 0 ? 'Nothing in this run failed.' : undefined}
            onClick={() => onAction('retry-failed')}
          >
            {pending === 'retry-failed' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw aria-hidden="true" />
            )}
          </Button>

          {/* A download, not a fetch: the endpoint answers with a file rather than the
              envelope, so the browser handles it. */}
          <a
            href={ballotsApi.exportUrl(run.id)}
            download
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 font-mono text-btn font-semibold whitespace-nowrap text-text transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>EXPORT</span>
          </a>
        </div>
      </div>

      {/* §B7 rule 6 — a stop names its own scale before it happens. */}
      <ConfirmDialog
        open={confirmingStop}
        onOpenChange={setConfirmingStop}
        verb="Stop"
        count={1}
        noun="run"
        title="Stop this run?"
        description={`${inFlight} ${inFlight === 1 ? 'task is' : 'tasks are'} still running. They will be marked SKIPPED, and this run cannot be restarted — only retried as a new one.`}
        confirmLabel="Stop run"
        onConfirm={() => {
          setConfirmingStop(false)
          onStop()
        }}
      />
    </header>
  )
}

/** `run_7f3a…` — enough to recognise, short enough for a breadcrumb. */
function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 10)}…` : id
}

function RunIdCopy({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  // Cleared on unmount as well as on the timer: without it, navigating away inside the
  // two seconds sets state on a component that is gone.
  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          .writeText(id)
          .then(() => setCopied(true))
          .catch(() => toast.error('Could not copy the run id.'))
      }}
      aria-label={`Copy run id ${id}`}
      className="group inline-flex items-center gap-1.5 rounded-sm font-mono text-body text-muted transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span>{id}</span>
      {copied ? (
        <Check className="size-3.5 text-success-ink" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5 opacity-60 group-hover:opacity-100" aria-hidden="true" />
      )}
      <span className="sr-only" role="status">
        {copied ? 'Run id copied.' : ''}
      </span>
    </button>
  )
}

/**
 * `started 14:02 · elapsed 04:12`.
 *
 * The tick is a 1s interval, and it is torn down by its own effect on unmount and
 * never started at all once the run is finished — §B7 rule 4 is about polls, but a
 * clock that keeps running on a screen nobody is on is the same bug with a smaller
 * blast radius.
 */
function Elapsed({ run, startedLabel }: { run: BallotRun; startedLabel: string }) {
  const finished = run.finishedAt !== undefined
  const [, force] = React.useReducer((n: number) => n + 1, 0)

  React.useEffect(() => {
    if (finished) return
    const timer = setInterval(force, 1000)
    return () => clearInterval(timer)
  }, [finished])

  const started = Date.parse(run.startedAt)
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now()

  return (
    <span className="font-mono text-body text-muted tabular-nums">
      <span className="text-faint">started </span>
      {startedLabel}
      <span className="text-faint"> · </span>
      <span className="text-faint">{finished ? 'took ' : 'elapsed '}</span>
      <span className={cn(!finished && 'text-text')}>
        {formatDuration(Math.max(0, end - started))}
      </span>
    </span>
  )
}

export function RunHeaderSkeleton() {
  return (
    <header className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-[320px]" />
          <Skeleton className="h-5 w-[420px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </header>
  )
}
