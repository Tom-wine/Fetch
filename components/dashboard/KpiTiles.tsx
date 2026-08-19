'use client'

import { Banknote, CalendarRange, Ticket } from 'lucide-react'

import { ErrorState, SkeletonCard } from '@/components/data/states'
import { StatTile } from '@/components/domain/StatTile'
import { Money, Num } from '@/components/domain/Money'
import type { KpiSet, RevenuePoint } from '@/lib/types'
import { flowDelta, lastTwoMonths, totalDelta } from './metrics'

/**
 * Row 1 of §8.1 — three tiles, each with the month-on-month change of the number
 * printed above it. See `metrics.ts` for why two of the three use a different
 * formula from the third.
 *
 * The tiles are direct children of the page grid rather than a nested row, so they
 * share the same column tracks as everything below them and the gradient icon
 * squares line up with the health strip's counters.
 */
export function KpiTiles({
  kpis,
  revenue,
  loading,
  error,
  onRetry,
}: {
  kpis: KpiSet | null
  revenue: RevenuePoint[]
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface lg:col-span-3">
        <ErrorState message={error} onRetry={onRetry} className="min-h-[160px]" />
      </div>
    )
  }

  if (loading || !kpis) {
    return (
      <>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </>
    )
  }

  const { current, previous } = lastTwoMonths(revenue)

  return (
    <>
      <StatTile
        icon={Banknote}
        label="Total resale revenue"
        // The total's own month-on-month move: what this month added, over what
        // the total stood at before it.
        delta={totalDelta(kpis.totalRevenue, kpis.monthRevenue)}
      >
        <Money amount={kpis.totalRevenue} currency={kpis.currency} />
      </StatTile>

      <StatTile
        icon={Ticket}
        label="Tickets sold"
        delta={totalDelta(kpis.ticketsSold, current?.ticketsSold ?? 0)}
      >
        <Num value={kpis.ticketsSold} />
      </StatTile>

      <StatTile
        icon={CalendarRange}
        // The bucket key from GET /revenue, not a formatted month — there is no
        // month formatter in lib/format yet and no component may format a date
        // itself (§9 rule 6). See the ASK in fetch-sync.md; the chart's x-axis
        // carries the same key, so the tile and the last bar read alike.
        label={current ? `${current.period} revenue` : 'This month revenue'}
        // A monthly flow, so this one is the classic this-month-vs-last-month.
        delta={flowDelta(current?.revenue, previous?.revenue)}
      >
        <Money amount={kpis.monthRevenue} currency={kpis.currency} />
      </StatTile>
    </>
  )
}
