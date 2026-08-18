'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { Fixture } from '@/lib/types'
import { Num } from '@/components/domain/Money'
import { FixtureIdentity } from '@/components/domain/FixtureIdentity'
import { SectionLabel } from '@/components/ui/typography'
import { KickoffCell } from './KickoffCell'
import { ValueAtRisk } from './ValueAtRisk'

/**
 * One fixture as a card — the grid view, and the stacked layout under `md`
 * (§9 rule 3). Same data as the row: crest and fixture, kickoff with its ramp, the
 * four counts, value at risk.
 *
 * It is an anchor rather than a div with an onClick, so the whole card is one tab
 * stop, `enter` opens it and a middle-click opens it in a new tab — the three things
 * a fake clickable card always loses.
 */
export function FixtureCard({
  fixture,
  /** Off when the card sits inside DataTable's own clickable card wrapper under `md`. */
  linked = true,
  className,
}: {
  fixture: Fixture
  linked?: boolean
  className?: string
}) {
  const { total, listed, sold, transferred } = fixture.counts

  const Root = linked ? Link : 'div'
  const rootProps = linked ? { href: `/mytickets/fixture/${fixture.id}` } : {}

  return (
    <Root
      {...(rootProps as { href: string })}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        linked && 'hover:border-border-strong hover:bg-surface-hover',
        className,
      )}
    >
      <FixtureIdentity
        homeClub={fixture.homeClub}
        awayClub={fixture.awayClub}
        competition={fixture.competition}
        matchweek={fixture.matchweek}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <KickoffCell value={fixture.kickoff} />
        <div className="min-w-0 text-right">
          <div className="truncate text-caption text-muted">{fixture.venue.name}</div>
          <div className="truncate text-caption text-faint">{fixture.venue.city}</div>
        </div>
      </div>

      {/* Two by two on a phone: four mono columns at 343px truncates TRANSFERRED to
          `TRANSFERR…`, and a label you cannot read is not a label. */}
      <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
        <Count label="total" value={total} tone="text-primary-ink" />
        <Count label="listed" value={listed} tone="text-success-ink" />
        <Count label="sold" value={sold} tone="text-violet-ink" />
        <Count label="transferred" value={transferred} tone="text-warning-ink" />
      </dl>

      <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
        <SectionLabel>value at risk</SectionLabel>
        <ValueAtRisk fixture={fixture} />
      </div>
    </Root>
  )
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-label text-faint uppercase">{label}</dt>
      <dd className={cn('text-title font-semibold', value === 0 ? 'text-faint' : tone)}>
        <Num value={value} />
      </dd>
    </div>
  )
}
