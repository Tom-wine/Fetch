'use client'

import * as React from 'react'
import { Map as MapIcon } from 'lucide-react'

import { EmptyState } from '@/components/data/states'
import { SectionLabel } from '@/components/ui/typography'
import { Num } from '@/components/domain/Money'
import { useFixtureSeatmap } from '@/lib/api/hooks/useFixtureDetail'
import { sectionForBlock } from '@/lib/registries/stadiums'
import type { Fixture, Ticket } from '@/lib/types'
import { StadiumMap, type StandCounts } from './StadiumMap'

/**
 * The `Seat Map` tab.
 *
 * It asks `GET /fixtures/:id/seatmap` on reach and draws whatever comes back. Today
 * the mock returns a per-stadium SCHEMATIC — the venue's real, named stands around a
 * pitch — and this tab tints each stand by the seats the operator owns there. A real
 * backend can return a provider SVG behind the same endpoint with no change here.
 *
 * Honesty rule, unchanged from before: the geometry is not to scale. The stand names
 * are real; their positions are a schematic. The caption says so.
 */
export function SeatMapTab({
  fixture,
  tickets,
  selectedIds,
}: {
  fixture: Fixture
  /** Every seat on the fixture, not just the loaded page. */
  tickets: Ticket[]
  selectedIds: Set<string>
}) {
  const query = useFixtureSeatmap(fixture.id)
  const seatmap = query.data?.data ?? null

  // Tally each ticket into its stand, and keep the ones that match no stand so the
  // block list below can still show them.
  const { counts, blocks } = React.useMemo(() => {
    const sections = seatmap?.sections ?? []
    const counts = new Map<string, StandCounts>()
    const blocks = new Map<string, { total: number; selected: number; section: string | null }>()

    for (const ticket of tickets) {
      const section = sections.length ? sectionForBlock(ticket.block, sections) : null
      const isSelected = selectedIds.has(ticket.id)

      if (section) {
        const c = counts.get(section.id) ?? { total: 0, selected: 0 }
        c.total += 1
        if (isSelected) c.selected += 1
        counts.set(section.id, c)
      }

      const b = blocks.get(ticket.block) ?? {
        total: 0,
        selected: 0,
        section: section?.name ?? null,
      }
      b.total += 1
      if (isSelected) b.selected += 1
      blocks.set(ticket.block, b)
    }

    return {
      counts,
      blocks: [...blocks.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en')),
    }
  }, [seatmap, tickets, selectedIds])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {query.isPending ? (
        <MapSkeleton venue={fixture.venue.name} />
      ) : seatmap && seatmap.sections.length > 0 ? (
        <div className="shrink-0 border-b border-border px-4 py-4">
          <StadiumMap
            sections={seatmap.sections}
            counts={counts}
            venue={seatmap.venue}
            className="mx-auto max-w-[440px]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-caption text-muted">
            <LegendSwatch className="bg-primary-solid/50 border-primary-solid" /> owned
            <LegendSwatch className="border-primary-ink ring-1 ring-primary-ink" /> has selection
            <LegendSwatch className="bg-surface-raised border-border" /> no seats
          </div>
          <p className="mt-2 text-center text-caption text-faint">
            {seatmap.attribution ?? 'Schematic — stand layout, not a to-scale plan.'}
          </p>
        </div>
      ) : (
        <EmptyState
          icon={MapIcon}
          title="Map unavailable"
          body={`No seat map could be loaded for ${fixture.venue.name}.`}
          glyph="brackets"
          className="min-h-[200px] shrink-0 py-8"
        />
      )}

      {blocks.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <SectionLabel>blocks in this inventory</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {blocks.map(([block, entry]) => (
              <li
                key={block}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-2.5 py-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body text-text">{block}</span>
                  {entry.section && (
                    <span className="truncate text-caption text-faint">{entry.section}</span>
                  )}
                </span>
                <span className="shrink-0 text-caption text-muted tabular-nums">
                  {entry.selected > 0 && (
                    <span className="mr-2 text-primary-ink">
                      <Num value={entry.selected} /> selected
                    </span>
                  )}
                  <Num value={entry.total} /> {entry.total === 1 ? 'seat' : 'seats'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function LegendSwatch({ className }: { className?: string }) {
  return <span className={`inline-block size-3 shrink-0 rounded-sm border align-middle ${className}`} />
}

function MapSkeleton({ venue }: { venue: string }) {
  return (
    <div className="shrink-0 border-b border-border px-4 py-4">
      <div className="mx-auto aspect-[320/220] w-full max-w-[440px] animate-pulse rounded-lg bg-surface-raised" />
      <p className="mt-3 text-center text-caption text-faint">Loading the map for {venue}…</p>
    </div>
  )
}
