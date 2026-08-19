'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Fixture, Ticket } from '@/lib/types'
import { FixtureInfoTab } from './FixtureInfoTab'
import { SeatMapTab } from './SeatMapTab'
import { TicketInfoTab } from './TicketInfoTab'
import type { PanelTab } from './url-state'

/**
 * The right-hand context panel (§8.5). Three tabs, one card, and it never becomes a
 * modal — the operator has to be able to read the seats and the seat table at the
 * same time, which is the whole reason this screen is two panes.
 *
 * The tab labels are `whitespace-nowrap` and the list is a three-column grid rather
 * than a flex row that can shrink its children. That is deliberate: the failure this
 * screen is replacing rendered `Seat Map` as `Sea`, and a truncated tab label is a
 * control the operator cannot identify.
 */
const TABS: Array<{ value: PanelTab; label: string }> = [
  { value: 'ticket', label: 'Ticket Info' },
  { value: 'fixture', label: 'Fixture Info' },
  { value: 'map', label: 'Seat Map' },
]

export function DetailPanel({
  fixture,
  selected,
  fixtureTickets,
  blocks,
  tab,
  onTabChange,
  className,
}: {
  fixture: Fixture
  /** The current selection, in table order. */
  selected: Ticket[]
  /** Every seat on the fixture — the map tab counts them, the table only holds a page. */
  fixtureTickets: Ticket[]
  blocks: string[]
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  className?: string
}) {
  const selectedIds = React.useMemo(() => new Set(selected.map((t) => t.id)), [selected])

  return (
    <section
      aria-label="Fixture context"
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface',
        className,
      )}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as PanelTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-border p-2">
          <TabsList className="grid h-9 w-full grid-cols-3 gap-1 bg-surface-raised p-1">
            {TABS.map((entry) => (
              <TabsTrigger
                key={entry.value}
                value={entry.value}
                className="rounded-sm px-1.5 font-mono text-btn font-semibold whitespace-nowrap text-muted data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* `mt-0` overrides the primitive's spacing: the panel body starts at the
            divider, and every tab fills the same box so switching does not resize it. */}
        <TabsContent value="ticket" className="mt-0 flex min-h-0 flex-1 flex-col">
          <TicketInfoTab fixture={fixture} tickets={selected} />
        </TabsContent>

        <TabsContent value="fixture" className="mt-0 flex min-h-0 flex-1 flex-col">
          <FixtureInfoTab fixture={fixture} blocks={blocks} />
        </TabsContent>

        <TabsContent value="map" className="mt-0 flex min-h-0 flex-1 flex-col">
          <SeatMapTab fixture={fixture} tickets={fixtureTickets} selectedIds={selectedIds} />
        </TabsContent>
      </Tabs>
    </section>
  )
}
