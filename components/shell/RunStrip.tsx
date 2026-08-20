'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { PulseDot } from '@/components/ballots/vocabulary'
import { useActiveRun } from '@/lib/api/hooks/useActiveRun'

/**
 * The run, on every screen.
 *
 * Navigating away from the monitor used to mean losing all awareness of the thing the
 * app exists to do — an operator on /accounts had no way of knowing their run had
 * started failing except to go back and look. The strip is the smallest honest fix:
 * the id, how far through it is, the rate, and a link back.
 *
 * It disappears the moment no run is active, so it costs nothing on a quiet day. It
 * reads the same query the dashboard's ACTIVE_RUN card reads — one poll for both, at
 * the monitor's own 2s cadence, so the strip and the monitor can never disagree.
 *
 * Hidden on the monitor itself: a banner pointing at the screen you are already on is
 * furniture.
 */
export function RunStrip() {
  const { active } = useActiveRun()
  const pathname = usePathname()

  if (!active) return null
  if (pathname.startsWith(`/ballots/run/${active.id}`)) return null

  const { counts } = active
  const done = counts.success + counts.failed + counts.needsOtp + counts.skipped

  return (
    <Link
      href={`/ballots/run/${active.id}`}
      aria-label={`Open the run monitor. ${done} of ${counts.total} accounts attempted, ${counts.failed} failed.`}
      className={cn(
        // Shrinkable, and the controls beside it are not: on a 375px screen the strip
        // gives up its own characters rather than pushing the account menu off the edge.
        'pointer-events-auto flex h-9 min-w-0 shrink items-center gap-2 overflow-hidden rounded-md border px-2.5 sm:px-3',
        'font-mono text-caption whitespace-nowrap transition-colors duration-150',
        active.status === 'PAUSED'
          ? 'border-warning/30 bg-warning/12 text-warning-ink hover:bg-warning/20'
          : 'border-primary/30 bg-primary/12 text-primary-ink hover:bg-primary/20',
      )}
    >
      <PulseDot className={active.status === 'PAUSED' ? 'bg-warning' : 'bg-primary'} />

      {/* The id, not the label: the label is domain data that can run to forty
          characters, and this strip lives beside the search box on a 375px screen.
          Below sm even the id goes — the progress is what makes someone look. */}
      <span className="hidden truncate sm:inline">{active.id}</span>
      <span className="hidden text-faint sm:inline" aria-hidden="true">
        ·
      </span>

      <span className="tabular-nums">{`${done}/${counts.total}`}</span>

      {counts.failed > 0 && (
        <>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <span className="text-danger-ink tabular-nums">{`${counts.failed} failed`}</span>
        </>
      )}

      {/* The rate is the first thing to go when the room runs out — it is the least
          load-bearing of the three numbers. */}
      {active.ratePerMin > 0 && (
        <span className="hidden text-faint tabular-nums sm:inline">{`· ${active.ratePerMin}/min`}</span>
      )}

      <span aria-hidden="true">→</span>
    </Link>
  )
}
