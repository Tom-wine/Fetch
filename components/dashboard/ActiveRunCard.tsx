'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Display } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/data/states'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import {
  PulseDot,
  RunProgress,
  RunStatusChip,
  formatEstimate,
} from '@/components/ballots/vocabulary'
import { useActiveRun } from '@/lib/api/hooks/useActiveRun'
import type { BallotRun } from '@/lib/types'

/**
 * Row 1 of /dashboard, full width — the reason the screen exists.
 *
 * Ballot entries are the product. The operator opens this app with one question, and
 * for as long as a run is moving the answer is here: what is running, how far through
 * it is, how many have failed, and one click to the monitor. Before this card the
 * dashboard opened with a revenue figure and the run was three navigations away.
 *
 * When nothing is running the same slot does not go blank or shrink — it reports the
 * last run's outcome and offers START_RUN as the screen's primary action. An empty
 * control room still has to say what to do next.
 */
export function ActiveRunCard({ className }: { className?: string }) {
  const { active, last, loading, error, onRetry } = useActiveRun()

  return (
    <section
      aria-label="Active run"
      className={cn(
        'rounded-lg border bg-surface shadow-sm dark:shadow-none',
        // The one card on the screen that changes its own border: a run in flight is
        // the only thing here worth interrupting someone for.
        active ? 'border-primary/40' : 'border-border',
        className,
      )}
    >
      {error ? (
        <ErrorState message={error} onRetry={onRetry} className="min-h-[172px]" />
      ) : loading ? (
        <LoadingRun />
      ) : active ? (
        <LiveRun run={active} />
      ) : (
        <IdleRun run={last} />
      )}
    </section>
  )
}

function LiveRun({ run }: { run: BallotRun }) {
  const { counts } = run
  const done = counts.success + counts.failed + counts.needsOtp + counts.skipped

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <span className="flex items-center gap-2 font-mono text-label text-faint">
            <PulseDot className={run.status === 'RUNNING' ? 'bg-primary' : 'bg-warning'} />
            {run.status === 'RUNNING' ? 'RUNNING_NOW' : 'PAUSED'}
          </span>

          {/* The label is the operator's own string (§B7 rule 7). */}
          <Display as="h2" size="h1" verbatim className="mt-2 line-clamp-2 text-text">
            {run.label}
          </Display>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1">
              {run.clubIds.map((club) => (
                <ClubBadge key={club} club={club} variant="crest-only" size="sm" />
              ))}
            </span>
            <RunStatusChip status={run.status} />
            <span className="font-mono text-body text-muted">
              <span className="text-faint">started </span>
              <RelativeTime value={run.startedAt} />
            </span>
          </div>
        </div>

        <Button asChild>
          <Link href={`/ballots/run/${run.id}`}>
            <Play className="size-4" aria-hidden="true" />
            <span>OPEN_MONITOR</span>
            <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <RunProgress counts={counts} className="h-2.5" label={`Progress of ${run.label}`} />

        {/* The bar says the shape; this line says the numbers, in words, so nothing
            here depends on telling green from red. */}
        <p className="font-mono text-caption text-muted tabular-nums">
          <span className="text-success-ink">{counts.success} ok</span>
          <span className="text-faint"> · </span>
          <span className={counts.failed > 0 ? 'text-danger-ink' : undefined}>
            {counts.failed} failed
          </span>
          <span className="text-faint"> · </span>
          <span>{counts.queued + counts.running} to go</span>
          <span className="text-faint">{` · ${done} of ${counts.total} attempted`}</span>
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
        <Figure label="success" value={String(counts.success)} tone="text-success-ink" />
        <Figure label="failed" value={String(counts.failed)} tone="text-danger-ink" />
        <Figure label="rate" value={run.ratePerMin > 0 ? `${run.ratePerMin}/min` : '—'} />
        <Figure
          label="eta"
          value={run.etaSeconds !== undefined ? formatEstimate(run.etaSeconds) : '—'}
        />
      </dl>
    </div>
  )
}

/**
 * Nothing is running. The slot keeps its weight and changes its job: what happened last
 * time, and the button that starts the next one.
 */
function IdleRun({ run }: { run: BallotRun | null }) {
  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <span className="font-mono text-label text-faint">
            {run ? 'NO_RUN_IN_FLIGHT' : 'NOTHING_HAS_RUN_YET'}
          </span>

          <Display as="h2" size="h1" verbatim className="mt-2 line-clamp-2 text-text">
            {run ? run.label : 'Ready when you are'}
          </Display>

          {run ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-1">
                {run.clubIds.map((club) => (
                  <ClubBadge key={club} club={club} variant="crest-only" size="sm" />
                ))}
              </span>
              <RunStatusChip status={run.status} />
              <span className="font-mono text-body text-muted">
                <span className="text-faint">finished </span>
                <RelativeTime value={run.finishedAt ?? run.startedAt} />
              </span>
            </div>
          ) : (
            <p className="mt-2 max-w-[52ch] font-prose text-prose text-muted">
              Load some club accounts into the pool, pick a profile, and Fetch.io enters them one by
              one while you watch.
            </p>
          )}
        </div>

        <Button asChild variant="gradient">
          <Link href="/ballots?tab=pool&start=1">
            <Play className="size-4" aria-hidden="true" />
            <span>START_RUN</span>
            <span aria-hidden="true">→</span>
          </Link>
        </Button>
      </div>

      {run && (
        <>
          <RunProgress counts={run.counts} className="h-2.5" label={`Result of ${run.label}`} />

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="font-mono text-caption text-muted tabular-nums">
              <span className="text-success-ink">{run.counts.success} ok</span>
              <span className="text-faint"> · </span>
              <span className={run.counts.failed > 0 ? 'text-danger-ink' : undefined}>
                {run.counts.failed} failed
              </span>
              <span className="text-faint">{` · of ${run.counts.total}`}</span>
            </p>

            <Link
              href={`/ballots/run/${run.id}`}
              className="font-mono text-caption text-muted transition-colors hover:text-text"
            >
              open the last run <span aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-label text-faint uppercase">{label}</dt>
      <dd className={cn('mt-1 font-mono text-h2 leading-none font-bold tabular-nums', tone)}>
        {value}
      </dd>
    </div>
  )
}

function LoadingRun() {
  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-[280px]" />
          <Skeleton className="h-5 w-[220px]" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-2.5 w-full rounded-full" />
      <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  )
}
