'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionLabel } from '@/components/ui/typography'
import { ErrorState } from '@/components/data/states'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { ballotsApi } from '@/lib/api/endpoints'
import type { BallotClubId, BallotTask, RunEvent } from '@/lib/types'

/**
 * `SUMMARY` (§B5.5) — what went wrong, where, and how long it took.
 *
 * Three questions the table cannot answer while it is showing one filtered page:
 * which failures dominate, which clubs they land on, and whether the run is slow.
 *
 * The error breakdown is keyed by CODE and each row carries the club's own sentence
 * beside it (§B7 rule 3) — `RATE_LIMITED 14` tells an operator nothing on its own, and
 * the decision it feeds (lower the concurrency) is in the sentence.
 */
export function SummaryTab({
  runId,
  tasks,
  events,
  loading,
  error,
  onRetry,
}: {
  runId: string
  /** Every task in the run, unfiltered. */
  tasks: BallotTask[]
  /** The run feed, for the readable sentence attached to each code. */
  events: RunEvent[]
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const stats = React.useMemo(() => summarise(tasks, events), [tasks, events])

  if (error) {
    return <ErrorState title="Summary unavailable" message={error} onRetry={onRetry} />
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="space-y-4 px-3 py-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <section className="space-y-2">
          <SectionLabel>timing</SectionLabel>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="median" value={stats.medianMs === null ? '—' : fmt(stats.medianMs)} />
            <Stat label="slowest" value={stats.slowestMs === null ? '—' : fmt(stats.slowestMs)} />
            <Stat label="retried" value={String(stats.retried)} />
          </dl>
        </section>

        <section className="space-y-2">
          <SectionLabel>by_error_code</SectionLabel>
          {stats.byCode.length === 0 ? (
            <p className="font-prose text-prose text-muted">
              Nothing has failed. Every account that has been attempted was accepted.
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.byCode.map((entry) => (
                <li key={entry.code} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-mono text-caption font-semibold text-muted">
                      {entry.code}
                    </span>
                    <span className="shrink-0 font-mono text-body font-bold text-danger-ink tabular-nums">
                      {entry.count}
                    </span>
                  </div>
                  <Bar value={entry.count} max={stats.worstCode} tone="bg-danger" />
                  {entry.message && (
                    // The readable half. Never `//`-prefixed (§B7 rule 3).
                    <p className="font-prose text-caption text-faint">{entry.message}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <SectionLabel>by_club</SectionLabel>
          <ul className="space-y-2">
            {stats.byClub.map((entry) => (
              <li key={entry.club} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <ClubBadge club={entry.club} size="sm" />
                  <span className="shrink-0 font-mono text-caption tabular-nums">
                    <span className="text-success-ink">{entry.success}</span>
                    <span className="text-faint"> / </span>
                    <span className={cn(entry.failed > 0 && 'text-danger-ink')}>
                      {entry.failed}
                    </span>
                    <span className="text-faint"> / {entry.total}</span>
                  </span>
                </div>
                <Bar value={entry.success} max={entry.total} tone="bg-success" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <a
          href={ballotsApi.exportUrl(runId)}
          download
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary-solid px-4 font-mono text-btn font-semibold whitespace-nowrap text-white transition-colors duration-150 hover:bg-primary-hover"
        >
          <span>EXPORT_RESULTS</span>
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-2.5 py-2">
      <dt className="truncate font-mono text-label text-faint uppercase">{label}</dt>
      <dd className="font-mono text-body font-bold text-text tabular-nums">{value}</dd>
    </div>
  )
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <div className={cn('h-full', tone)} style={{ width: `${width}%` }} />
    </div>
  )
}

function fmt(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

interface Summary {
  medianMs: number | null
  slowestMs: number | null
  retried: number
  byCode: Array<{ code: string; count: number; message?: string }>
  worstCode: number
  byClub: Array<{ club: BallotClubId; total: number; success: number; failed: number }>
}

/**
 * The median rather than the mean. One task that hit a 60s timeout drags a mean far
 * enough to make a healthy run look broken, and "half the accounts took less than
 * this" is the sentence an operator actually wants.
 */
function summarise(tasks: BallotTask[], events: RunEvent[]): Summary {
  const durations = tasks
    .map((task) => task.durationMs)
    .filter((ms): ms is number => ms !== undefined)
    .sort((a, b) => a - b)

  const medianMs = durations.length
    ? durations.length % 2 === 1
      ? durations[(durations.length - 1) / 2]!
      : Math.round((durations[durations.length / 2 - 1]! + durations[durations.length / 2]!) / 2)
    : null

  // The event feed is where the codes live — a task keeps only its LAST message, so
  // an account that was rate-limited and then succeeded on retry would vanish from a
  // task-only count. The run's own log is the honest source.
  const codeCounts = new Map<string, { count: number; message?: string }>()
  for (const event of events) {
    if (event.level !== 'error' && event.level !== 'warn') continue
    const held = codeCounts.get(event.code)
    codeCounts.set(event.code, {
      count: (held?.count ?? 0) + 1,
      message: held?.message ?? event.message,
    })
  }

  const byCode = [...codeCounts.entries()]
    .map(([code, entry]) => ({ code, ...entry }))
    .sort((a, b) => b.count - a.count)

  const clubs = new Map<BallotClubId, { total: number; success: number; failed: number }>()
  for (const task of tasks) {
    const held = clubs.get(task.clubId) ?? { total: 0, success: 0, failed: 0 }
    held.total++
    if (task.status === 'SUCCESS') held.success++
    if (task.status === 'FAILED') held.failed++
    clubs.set(task.clubId, held)
  }

  return {
    medianMs,
    slowestMs: durations.length ? durations[durations.length - 1]! : null,
    retried: tasks.filter((task) => task.attempt > 1).length,
    byCode,
    worstCode: byCode[0]?.count ?? 0,
    byClub: [...clubs.entries()]
      .map(([club, entry]) => ({ club, ...entry }))
      .sort((a, b) => b.total - a.total),
  }
}
