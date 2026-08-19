'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { formatMonth } from '@/lib/format/date'
import { useLocale } from '@/lib/format/LocaleProvider'
import { ErrorState } from '@/components/data/states'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BarChart } from '@/components/domain/charts'
import type { RevenuePoint } from '@/lib/types'
import { Panel } from './Panel'
import { toChartData, type Metric } from './metrics'

/**
 * The plot's height.
 *
 * It is a constant rather than a measurement of the card. The card is a grid cell,
 * so its height comes from the taller right-hand column, and `BarChart` takes a
 * number rather than `100%` — filling it would mean observing the box that the
 * chart itself sits in, which is a loop dressed up as a layout. A fixed plot,
 * centred in whatever the row gives it, reads as a deliberate margin instead.
 */
const PLOT_HEIGHT = 460

const METRICS: Array<{ id: Metric; label: string; name: string }> = [
  { id: 'revenue', label: 'Revenue', name: 'Revenue' },
  { id: 'tickets', label: 'Tickets', name: 'Tickets sold' },
]

/**
 * Row 2 left of §8.1 — twelve monthly buckets from `GET /revenue?groupBy=month`.
 *
 * The toggle is local state, not URL state. Everywhere else in the app a control
 * that changes what is on screen writes the query string, because those controls
 * are filters and an operator sends a filtered view to a colleague. This one is a
 * lens over a payload that has already arrived — both series come down in the same
 * response and no request is made when it flips — so there is nothing to bookmark
 * and nothing to re-fetch.
 *
 * The x value is the API's own bucket key (`2026-08`), rendered through
 * `formatMonth` — the one date seam (§9 rule 6), never `Intl` from here. The label
 * is formatted onto the datum rather than through a recharts `tickFormatter` so the
 * tooltip heading and the axis cannot drift apart: the key is a bucket identifier,
 * not a value, and it is only ever shown to a human.
 *
 * The short style keeps the year (`Aug 2026`, not `Aug`), because twelve buckets span
 * a year boundary and a bare month name would put two Augusts on one axis.
 */
export function RevenueCard({
  revenue,
  loading,
  error,
  onRetry,
  className,
}: {
  revenue: RevenuePoint[]
  loading: boolean
  error: string | null
  onRetry: () => void
  className?: string
}) {
  const [metric, setMetric] = React.useState<Metric>('revenue')
  const { settings } = useLocale()

  const data = React.useMemo(
    () =>
      toChartData(revenue).map((point) => ({
        ...point,
        period: formatMonth(point.period, settings),
      })),
    [revenue, settings],
  )
  const currency = revenue[0]?.currency ?? 'GBP'
  const active = METRICS.find((option) => option.id === metric) ?? METRICS[0]

  return (
    <Panel
      title="Revenue by month"
      // Not "revenue by month" again, and not "resale split" -- there is no resale
      // domain to split. The label's job is to add the window the title leaves out.
      label="last_twelve_months"
      className={className}
      bodyClassName="flex items-center"
      actions={
        <ToggleGroup
          type="single"
          value={metric}
          // Radix emits '' when the active item is clicked again; a segmented
          // control has no empty state, so that click is a no-op.
          onValueChange={(value) => value && setMetric(value as Metric)}
          className="gap-0.5 rounded-md border border-border bg-surface-raised p-0.5"
        >
          {METRICS.map((option) => (
            <ToggleGroupItem
              key={option.id}
              value={option.id}
              size="sm"
              className="h-7 rounded-sm px-3 font-mono text-btn font-semibold tracking-[0.06em] text-muted hover:bg-transparent hover:text-text data-[state=on]:bg-surface data-[state=on]:text-text data-[state=on]:shadow-sm"
            >
              {upperSnake(option.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={onRetry} className="w-full" />
      ) : loading ? (
        <Skeleton className="w-full" style={{ height: PLOT_HEIGHT }} />
      ) : data.length === 0 ? (
        <p className="flex w-full items-center justify-center font-prose text-prose text-muted">
          No months have closed yet. The first bucket appears once a sale settles.
        </p>
      ) : (
        // The privacy eye blurs `.money`, and on this card the money IS the plot —
        // the bar heights are the revenue, and the axis and tooltip live inside the
        // SVG where <Money> cannot reach. So the whole plot carries the class while
        // the revenue series is showing, and does not while the ticket counts are,
        // which are not monetary.
        <div className={cn('w-full', metric === 'revenue' && 'money')}>
          <BarChart
            data={data}
            xKey="period"
            series={[{ key: metric, name: active.name }]}
            kind={metric === 'revenue' ? 'money' : 'number'}
            currency={currency}
            height={PLOT_HEIGHT}
          />
        </div>
      )}
    </Panel>
  )
}
