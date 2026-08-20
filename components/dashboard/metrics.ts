import type { RevenuePoint } from '@/lib/types'

/**
 * The arithmetic behind the money tiles and the revenue chart, kept out of the
 * components so the definition of a delta chip is written down once.
 *
 * THE RULE FOR EVERY CHIP
 *
 * A delta chip states the month-on-month change of the value printed directly above
 * it — never a related number that happens to be nearby. The tile that carries one
 * shows a RUNNING TOTAL, so its arithmetic is `added / (total - added)` rather than
 * the `(now - before) / before` a monthly flow would use. Using the flow formula on a
 * running total reports a change the total never made, which is exactly the kind of
 * confidently-wrong number an operator acts on.
 *
 * The flow helpers went with the third tile when the dashboard became a control room
 * for runs: nothing on the screen compares two months any more.
 */

export type Metric = 'revenue' | 'tickets'

/** The chart's datum. A type alias, not an interface, so it keeps the implicit
 *  index signature `charts.tsx` needs (`Record<string, string | number>`). */
export type RevenueDatum = {
  period: string
  revenue: number
  tickets: number
}

export function toChartData(points: RevenuePoint[]): RevenueDatum[] {
  return points.map((p) => ({ period: p.period, revenue: p.revenue, tickets: p.ticketsSold }))
}

/**
 * Month-on-month change of a RUNNING TOTAL — what this month added, over what the
 * total stood at before it.
 *
 * `undefined` (no chip) when the "before" figure is not positive. That is the honest
 * answer for a tenant whose first month is the only month: there is no prior total to
 * have moved from, and any percentage would be invented.
 *
 * It used to fire for a second reason. `/kpis` drew its total from the ticket store
 * and its month from the revenue series — two independently seeded sources — so
 * `addedThisMonth` could exceed `total` and `before` went negative, suppressing both
 * running-total chips on every load. Both figures now come from the revenue series
 * (see `app/api/v1/kpis/route.ts`), so the guard is back to meaning only what it
 * says.
 */
export function totalDelta(total: number, addedThisMonth: number): number | undefined {
  const before = total - addedThisMonth
  if (before <= 0 || addedThisMonth < 0) return undefined
  return addedThisMonth / before
}
