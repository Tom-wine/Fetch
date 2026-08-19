'use client'

import * as React from 'react'
import { Map as MapIcon } from 'lucide-react'

import { EmptyState } from '@/components/data/states'
import { SectionLabel } from '@/components/ui/typography'
import { Num } from '@/components/domain/Money'
import type { Fixture, Ticket } from '@/lib/types'

/**
 * The `Seat Map` tab.
 *
 * A stadium map is published by the club, per venue, and Fetch.io has no endpoint that
 * fetches one — so the tab is honest about that rather than drawing a generic bowl and
 * putting real block names on invented positions. A seat map whose geometry is made up
 * is worse than no map: an operator would use it to judge a view.
 *
 * What the tab CAN say truthfully is which parts of this stadium the inventory sits
 * in, so the space under the empty state is the block list rather than nothing. The
 * selected seats are marked, so the tab still answers "where am I" while it waits for
 * a map.
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
  const blocks = React.useMemo(() => {
    const byBlock = new Map<string, { total: number; selected: number }>()
    for (const ticket of tickets) {
      const found = byBlock.get(ticket.block) ?? { total: 0, selected: 0 }
      found.total += 1
      if (selectedIds.has(ticket.id)) found.selected += 1
      byBlock.set(ticket.block, found)
    }
    return [...byBlock.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))
  }, [tickets, selectedIds])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EmptyState
        icon={MapIcon}
        title="Map unavailable"
        body={`No seat map has been published for ${fixture.venue.name}. Fetch.io will show it here as soon as the club provides one.`}
        glyph="brackets"
        className="min-h-[200px] shrink-0 py-8"
      />

      {blocks.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 py-3">
          <SectionLabel>blocks in this inventory</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {blocks.map(([block, counts]) => (
              <li
                key={block}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-2.5 py-2"
              >
                <span className="min-w-0 truncate text-body text-text">{block}</span>
                <span className="shrink-0 text-caption text-muted tabular-nums">
                  {counts.selected > 0 && (
                    <span className="mr-2 text-primary-ink">
                      <Num value={counts.selected} /> selected
                    </span>
                  )}
                  <Num value={counts.total} /> {counts.total === 1 ? 'seat' : 'seats'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
