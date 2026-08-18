'use client'

import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { snake } from '@/lib/format/text'
import { Display } from '@/components/ui/typography'
import { Chip } from './StatusChip'
import { Percent } from './Money'

/**
 * The dashboard KPI tile (§7 #6): a 48px gradient icon square, the value in Outfit
 * Black, a lower_snake metric label, and a month-on-month delta chip.
 *
 * The gradient square is allowed use #2 of the five in §3.2 — one per tile, nothing
 * else in the tile carries it.
 *
 * `children` holds the value so the caller can pass <Money> (privacy-blurred and
 * locale-formatted) rather than a pre-formatted string.
 */
export function StatTile({
  icon: Icon,
  label,
  delta,
  children,
  className,
}: {
  icon: LucideIcon
  /** Chrome string — snake_cased here, so callers write it normally. */
  label: string
  /** Month-on-month change as a ratio: 0.124 renders `+12.4%`. */
  delta?: number
  children: React.ReactNode
  className?: string
}) {
  const up = delta !== undefined && delta >= 0

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm dark:shadow-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-md bg-fetch-gradient"
      >
        <Icon className="size-5 text-white" />
      </span>

      <div className="min-w-0 flex-1">
        <Display as="div" size="kpi" className="truncate text-text">
          {children}
        </Display>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted">{snake(label)}</span>
          {delta !== undefined && (
            <Chip tone={up ? 'success' : 'danger'} className="gap-1">
              {up ? (
                <TrendingUp className="size-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3" aria-hidden="true" />
              )}
              <Percent value={delta} />
            </Chip>
          )}
        </div>
      </div>
    </div>
  )
}
