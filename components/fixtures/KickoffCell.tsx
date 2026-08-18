'use client'

import { cn } from '@/lib/utils'
import { DateTime, RelativeTime } from '@/components/domain/RelativeTime'

/**
 * `14/09/2026, 15:00` with `in 3 days` under it (§8.4).
 *
 * The absolute time is the fact and stays neutral; the relative line carries the
 * ramp, because that is the half the eye scans. Both come from the shared
 * formatters, so the locale switch in Preferences moves them together.
 */
export function KickoffCell({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <DateTime value={value} />
      <RelativeTime value={value} ramp className="text-caption" />
    </div>
  )
}
