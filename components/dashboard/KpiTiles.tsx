'use client'

import { Banknote, Ticket } from 'lucide-react'

import { ErrorState, SkeletonCard } from '@/components/data/states'
import { StatTile } from '@/components/domain/StatTile'
import { Money, Num } from '@/components/domain/Money'
import type { KpiSet } from '@/lib/types'
import { totalDelta } from './metrics'

/**
 * The two money tiles, demoted.
 *
 * They used to be row 1 of the dashboard — three of them, opening the screen. Tickets
 * still sell and the totals are still true, but they are not what the operator came to
 * ask, so they sit in the narrow column beside the activity feed while the run and the
 * pool take the width.
 *
 * Two rather than three: the month's revenue is a slice of the total directly above it,
 * and a tile whose only job is to restate the neighbouring one at a smaller scale is
 * the sort of thing that gets on a dashboard because there was a gap. The monthly
 * breakdown lives on /insights now, in the chart it belongs to.
 *
 * Both carry the month-on-month change of the number printed above them, on the
 * running-total formula — see `metrics.ts` for why that is not the flow formula.
 */
export function KpiTiles({
  kpis,
  loading,
  error,
  onRetry,
}: {
  kpis: KpiSet | null
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (error) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState message={error} onRetry={onRetry} className="min-h-[160px]" />
      </div>
    )
  }

  if (loading || !kpis) {
    return (
      <>
        {[0, 1].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </>
    )
  }

  return (
    <>
      <StatTile
        icon={Banknote}
        label="Total revenue"
        // The total's own month-on-month move: what this month added, over what the
        // total stood at before it.
        delta={totalDelta(kpis.totalRevenue, kpis.monthRevenue)}
      >
        <Money amount={kpis.totalRevenue} currency={kpis.currency} />
      </StatTile>

      <StatTile icon={Ticket} label="Tickets sold">
        <Num value={kpis.ticketsSold} />
      </StatTile>
    </>
  )
}
