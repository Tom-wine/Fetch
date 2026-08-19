import type { RevenuePoint } from '@/lib/types'

/**
 * The arithmetic behind the three KPI tiles, kept out of the components so the
 * definition of each delta chip is written down once and can be read on its own.
 *
 * THE RULE FOR EVERY CHIP ON THIS SCREEN
 *
 * A delta chip states the month-on-month change of the value printed directly
 * above it — never a related number that happens to be nearby. That distinction
 * matters because two of the three tiles show a RUNNING TOTAL and one shows a
 * MONTHLY FLOW, and those have different month-on-month arithmetic:
 *
 *   flow   `this month` vs `last month`            → (now - before) / before
 *   total  `the total now` vs `the total a month   → added / (total - added)
 *          ago`, i.e. before this month was added
 *
 * Using the flow formula on a running total would report a change the total never
 * made, which is exactly the kind of confidently-wrong number an operator would
 * act on.
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
 * The last two buckets of the series, newest last. `null` when the series is too
 * short to compare — a first-month tenant gets no chip rather than a fake one.
 */
export function lastTwoMonths(points: RevenuePoint[]): {
  current: RevenuePoint | null
  previous: RevenuePoint | null
} {
  return {
    current: points.at(-1) ?? null,
    previous: points.length > 1 ? (points.at(-2) ?? null) : null,
  }
}

/**
 * Month-on-month change of a FLOW — this month's figure against last month's.
 * `undefined` (no chip) when there is no previous month, or when it was zero and
 * the percentage would be infinite.
 */
export function flowDelta(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined || previous <= 0) return undefined
  return (current - previous) / previous
}

/**
 * Month-on-month change of a RUNNING TOTAL — what this month added, over what the
 * total stood at before it. `undefined` when the "before" figure is not positive,
 * which also covers the case where the two numbers come from sources that disagree
 * (the seeded revenue series and the seeded ticket store are generated
 * independently, so `addedThisMonth` can exceed `total`; a chip derived from that
 * would be nonsense, so there is no chip).
 */
export function totalDelta(total: number, addedThisMonth: number): number | undefined {
  const before = total - addedThisMonth
  if (before <= 0 || addedThisMonth < 0) return undefined
  return addedThisMonth / before
}
