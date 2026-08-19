'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { snake } from '@/lib/format/text'
import { ErrorState } from '@/components/data/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Display } from '@/components/ui/typography'
import { Num } from '@/components/domain/Money'
import type { AccountStats, AccountStatus } from '@/lib/types'
import { Panel } from './Panel'

/**
 * Row 1.5 of §8.1 — the account-health strip.
 *
 * This is the Fetch.io addition and the reason the screen exists: an hour before an
 * on-sale the only question is "how many of my accounts can actually buy", and the
 * answer has to be one glance and one click away from the accounts that cannot.
 *
 * Every counter is a link into /accounts with the status already applied to the
 * URL, because /accounts reads its filters from the query string — so the strip
 * needs no cooperation from that screen and cannot drift from it.
 */

interface Segment {
  status: AccountStatus
  label: string
  /** Bar fill. */
  bar: string
  /** Counter dot. */
  dot: string
}

/**
 * The four §8.1 counters, in health order — best first, so the bar reads left to
 * right as the estate degrading.
 *
 * `needs_otp` is the same amber as `needs_login` at 55%, not a new hue: both wear
 * `warning` on their StatusChip over on /accounts, and inventing a third colour
 * here would mean the same account is amber on one screen and violet on another.
 * The value split plus the 2px gap is what keeps the two blocks apart in the bar;
 * the counters below carry the number and the name, so nothing is colour-only.
 */
const SEGMENTS: Segment[] = [
  { status: 'active', label: 'Active', bar: 'bg-success', dot: 'bg-success' },
  { status: 'needs_login', label: 'Needs login', bar: 'bg-warning', dot: 'bg-warning' },
  { status: 'needs_otp', label: 'Needs OTP', bar: 'bg-warning/55', dot: 'bg-warning/55' },
  { status: 'locked', label: 'Locked', bar: 'bg-danger', dot: 'bg-danger' },
]

/**
 * `AccountStatus` has six values and §8.1 asks for four counters. The other two are
 * still real accounts, so they get a bar segment and a line under the counters —
 * a bar that silently summed to less than the total would misreport the estate.
 */
const REST: Array<{ status: AccountStatus; label: string }> = [
  { status: 'expired', label: 'Expired' },
  { status: 'error', label: 'Error' },
]

function href(status: AccountStatus) {
  return `/accounts?status=${status}`
}

export function AccountHealthStrip({
  stats,
  loading,
  error,
  onRetry,
  className,
}: {
  stats: AccountStats | null
  loading: boolean
  error: string | null
  onRetry: () => void
  className?: string
}) {
  const byStatus = stats?.byStatus ?? {}
  const total = stats?.total ?? 0

  // Partial maps: a status nobody is in is absent, not zero (§5 / lib/types).
  const counts = SEGMENTS.map((segment) => ({ ...segment, count: byStatus[segment.status] ?? 0 }))
  const rest = REST.map((entry) => ({ ...entry, count: byStatus[entry.status] ?? 0 })).filter(
    (entry) => entry.count > 0,
  )
  const restTotal = rest.reduce((sum, entry) => sum + entry.count, 0)

  const summary = [
    ...counts.map((c) => `${c.count} ${c.label.toLowerCase()}`),
    ...rest.map((r) => `${r.count} ${r.label.toLowerCase()}`),
  ].join(', ')

  return (
    <Panel
      title="Account health"
      label="who can buy right now"
      className={className}
      actions={
        stats && (
          <Link
            href="/accounts"
            className="text-caption text-muted transition-colors hover:text-text"
          >
            <Num value={total} /> accounts <span aria-hidden="true">→</span>
          </Link>
        )
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={onRetry} className="min-h-[140px]" />
      ) : loading || !stats ? (
        <div className="space-y-4">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            role="img"
            aria-label={`Account health: ${summary}.`}
            className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-raised"
          >
            {[
              ...counts,
              ...(restTotal > 0
                ? [
                    {
                      status: 'expired' as AccountStatus,
                      label: 'Other',
                      bar: 'bg-neutral-chip/40',
                      count: restTotal,
                    },
                  ]
                : []),
            ]
              .filter((part) => part.count > 0)
              .map((part) => (
                <span
                  key={part.label}
                  // Proportional widths, with a floor so a single locked account
                  // out of sixty-four is still a visible mark rather than a hairline.
                  style={{ flexGrow: part.count, flexBasis: 0, minWidth: 6 }}
                  title={`${part.label}: ${part.count}`}
                  className={cn('h-full rounded-full', part.bar)}
                />
              ))}
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
            {counts.map((segment) => (
              <Link
                key={segment.status}
                href={href(segment.status)}
                className="group flex flex-col gap-1.5 bg-surface px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('size-2 shrink-0 rounded-full', segment.dot)}
                  />
                  <span className="text-caption text-muted">{snake(segment.label)}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <Display as="div" size="h2" className="text-text">
                    <Num value={segment.count} />
                  </Display>
                  <span
                    aria-hidden="true"
                    className="text-caption text-faint opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    view →
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {rest.length > 0 && (
            <p className="text-caption text-faint">
              Not counted above:{' '}
              {rest.map((entry, i) => (
                <React.Fragment key={entry.status}>
                  {i > 0 && ' · '}
                  {/*
                    Underlined at rest, not only on hover. These links sit inside a
                    sentence, so colour alone is the only thing telling them apart from
                    the prose around them — which is exactly what axe's
                    `link-in-text-block` catches, and what someone who cannot separate
                    those two greys experiences.
                  */}
                  <Link
                    href={href(entry.status)}
                    className="text-muted underline underline-offset-4 transition-colors hover:text-text"
                  >
                    {entry.count} {snake(entry.label)}
                  </Link>
                </React.Fragment>
              ))}
              .
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
