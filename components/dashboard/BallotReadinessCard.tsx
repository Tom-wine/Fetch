'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { ErrorState } from '@/components/data/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Num } from '@/components/domain/Money'
import { Hint } from '@/components/ui/tooltip'
import {
  BLOCKED_REASONS,
  EXPIRING_SOON_DAYS,
  REASON_ORDER,
  summariseReadiness,
} from '@/lib/ballots/readiness'
import { usePoolAccounts, useRunRequirements } from '@/lib/api/hooks/useActiveRun'
import { Panel } from './Panel'

/**
 * Row 2 of /dashboard — how many accounts can enter a ballot right now, and why the
 * rest cannot.
 *
 * This replaces ACCOUNT_HEALTH, which counted the same accounts and asked a different
 * question: "who can buy right now" was the resale-era question. The ballot question is
 * "who can ENTER", and the two do not have the same answer — an account with a valid
 * session and no proxy is healthy and cannot run.
 *
 * Readiness is judged against the profile the launcher will preselect, and the card
 * says which one, because "ready" is meaningless without naming the run it is ready
 * for: the same account is ready for a profile with no proxy group and blocked for one
 * that has it.
 *
 * Every counter is a link into the pool with the filter already applied, so the fix is
 * one click from the number that reports it.
 */
export function BallotReadinessCard({ className }: { className?: string }) {
  const { accounts, loading, error, onRetry } = usePoolAccounts()
  const { requirements, profile } = useRunRequirements()

  const summary = React.useMemo(
    () => summariseReadiness(accounts, requirements),
    [accounts, requirements],
  )

  const blocked = REASON_ORDER.map((reason) => ({
    reason,
    count: summary.byReason[reason],
  })).filter((entry) => entry.count > 0)

  return (
    <Panel
      title="Ballot readiness"
      // The profile's NAME is domain data — the operator typed it — and a panel label
      // is snake_cased chrome, so naming the profile here would render `azea_overnight`
      // at someone's own words (§3.3b guardrail). It goes in the sentence below instead.
      label="who can enter a ballot right now"
      className={className}
      actions={
        <Link
          href="/ballots?tab=pool"
          className="text-caption text-muted transition-colors hover:text-text"
        >
          <Num value={summary.total} /> in the pool <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={onRetry} className="min-h-[140px]" />
      ) : loading ? (
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
          <ReadyBar ready={summary.ready} total={summary.total} />

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            <Counter
              href="/ballots?tab=pool"
              label="Ready"
              count={summary.ready}
              tone="text-success-ink"
              hint="Session valid, membership live, and everything this profile needs."
              lead
            />

            {blocked.map(({ reason, count }) => (
              <Counter
                key={reason}
                href={BLOCKED_REASONS[reason].href}
                label={BLOCKED_REASONS[reason].label}
                count={count}
                tone="text-muted"
                hint={BLOCKED_REASONS[reason].hint}
              />
            ))}
          </div>

          {/* The strip this replaces admitted what it did not count, and that was the
              best thing about it. Same here: an expiring membership is not blocking
              tonight's run and will block one soon, so it is said out loud rather than
              folded into `ready`. */}
          {summary.expiringSoon > 0 && (
            <p className="font-prose text-caption text-muted">
              {`${summary.expiringSoon} of the ready accounts ${summary.expiringSoon === 1 ? 'has a membership' : 'have memberships'} lapsing inside ${EXPIRING_SOON_DAYS} days. `}
              <Link
                href="/accounts?status=expired"
                className="underline underline-offset-4 transition-colors hover:text-text"
              >
                Renew them before the next on-sale
              </Link>
              .
            </p>
          )}

          {/* "Ready" is meaningless without naming the run it is ready FOR: the same
              account is ready for a profile with no proxy group and blocked for one
              that has it. */}
          {profile && (
            <p className="font-prose text-caption text-muted">
              Measured against{' '}
              <Link
                href="/ballots?tab=profiles"
                className="underline underline-offset-4 transition-colors hover:text-text"
              >
                {profile.name}
              </Link>
              {`, the profile START_RUN starts with — ${describeRequirements(requirements)}.`}
            </p>
          )}

          {summary.total === 0 && (
            <p className="font-prose text-caption text-muted">
              Nothing in the pool yet.{' '}
              <Link
                href="/ballots?tab=pool"
                className="underline underline-offset-4 transition-colors hover:text-text"
              >
                Paste some club accounts
              </Link>{' '}
              and they appear here.
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}

/** What that profile demands, in words, so the counters below are not a mystery. */
function describeRequirements(requirements: {
  requiresProxy: boolean
  requiresOtpMailbox: boolean
  hasOtpMailbox: boolean
}): string {
  const needs: string[] = []
  if (requirements.requiresProxy) needs.push('a proxy on every account')
  if (requirements.requiresOtpMailbox) {
    needs.push(
      requirements.hasOtpMailbox ? 'a mailbox to read codes from' : 'a mailbox it does not have',
    )
  }
  if (needs.length === 0) return 'it needs nothing beyond a working session'
  return `it needs ${needs.join(' and ')}`
}

/** One bar: ready against everything else. Two segments, because it is a yes/no. */
function ReadyBar({ ready, total }: { ready: number; total: number }) {
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0

  return (
    <div
      role="progressbar"
      aria-label="Accounts ready to enter a ballot"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-raised"
    >
      {ready > 0 && <span className="bg-success" style={{ width: `${percent}%` }} />}
      {ready < total && <span className="flex-1 bg-neutral-chip" />}
    </div>
  )
}

function Counter({
  href,
  label,
  count,
  tone,
  hint,
  lead = false,
}: {
  href: string
  label: string
  count: number
  tone: string
  hint: string
  /** READY is the number the screen is actually about; it gets the larger figure. */
  lead?: boolean
}) {
  return (
    <Hint label={hint}>
      <Link
        href={href}
        className={cn(
          'flex min-w-0 flex-col gap-0.5 rounded-md px-2.5 py-2 transition-colors duration-150',
          'hover:bg-surface-hover',
          lead && 'bg-success/8 hover:bg-success/12',
        )}
      >
        <span className="truncate font-mono text-label text-faint uppercase">
          {upperSnake(label)}
        </span>
        <span
          className={cn(
            'font-mono leading-none font-bold tabular-nums',
            tone,
            lead ? 'text-h2' : 'text-title',
          )}
        >
          {count}
        </span>
      </Link>
    </Hint>
  )
}
