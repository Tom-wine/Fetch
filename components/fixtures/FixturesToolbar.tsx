'use client'

import * as React from 'react'
import Link from 'next/link'
import { Download, RotateCw, Upload } from 'lucide-react'

import { ALL, FilterSelect, type FilterOption } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { Button, buttonVariants } from '@/components/ui/button'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { CLUBS } from '@/lib/registries/clubs'
import { COMPETITION_LABEL } from '@/lib/registries/providers'
import { cn } from '@/lib/utils'
import { AccountPicker } from '@/components/domain/AccountPicker'
import { FixtureFiltersPopover } from './FixtureFiltersPopover'
import { SortControl } from './SortControl'
import { ViewToggle } from './ViewToggle'
import { COMPETITION_IDS, type FixtureFilterControls, type WhenFilter } from './filters'

/**
 * The §8.4 toolbar. It wraps at every width and never scrolls sideways (§9 rule 1):
 * search first, then the four filters, then the popover holding the long tail, then
 * the layout toggle, then the actions.
 *
 * Nothing here holds filter state. Every control reads from and writes to the URL, so
 * the bar and the table can never disagree — see `filters.ts`.
 */
export function FixturesToolbar({
  filters,
  onRefresh,
  onRefreshProvider,
  refreshing,
  onExport,
  exporting,
}: {
  filters: FixtureFilterControls
  onRefresh: () => void
  /** Per-provider `Refresh all`, so the toast can name what was re-checked. */
  onRefreshProvider: (label: string) => void
  refreshing: boolean
  onExport: () => void
  exporting: boolean
}) {
  const { state, set } = filters

  // The search box types faster than the API answers, so the field is local and the
  // URL follows a beat later. It re-syncs when the URL changes underneath it — which
  // is what "clear filters" and the back button do.
  const [term, setTerm] = React.useState(state.q)
  React.useEffect(() => setTerm(state.q), [state.q])
  React.useEffect(() => {
    if (term === state.q) return
    const id = setTimeout(() => set({ q: term }), 250)
    return () => clearTimeout(id)
  }, [term, state.q, set])

  return (
    <Toolbar
      search={<ToolbarSearch value={term} onChange={setTerm} placeholder="Search fixtures" />}
      filters={
        <>
          <FilterSelect
            value={state.when === 'all' ? ALL : state.when}
            onChange={(value) => set({ when: (value === ALL ? 'all' : value) as WhenFilter })}
            options={WHEN_OPTIONS}
            noun="fixtures"
            ariaLabel="Filter by kickoff window"
          />
          <FilterSelect
            value={state.club}
            onChange={(club) => set({ club })}
            options={CLUB_OPTIONS}
            noun="clubs"
          />
          <FilterSelect
            value={state.competition}
            onChange={(competition) => set({ competition })}
            options={COMPETITION_OPTIONS}
            noun="competitions"
          />
          <AccountPicker value={state.accountId} onChange={(accountId) => set({ accountId })} />
          <FixtureFiltersPopover
            filters={filters}
            onRefreshProvider={onRefreshProvider}
            refreshing={refreshing}
          />
          {/* Only where there is no header to click: stacked cards under md, and grid
              view at any width. At desktop table width the headers are the sort UI. */}
          <SortControl
            sort={state.sort}
            order={state.order}
            onSortChange={(sort) => set({ sort })}
            onOrderChange={(order) => set({ order })}
            className={state.view === 'grid' ? undefined : 'md:hidden'}
          />
          <ViewToggle value={state.view} onChange={(view) => set({ view })} />
        </>
      }
      actions={
        <>
          <Button
            label="Refresh"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh the inventory"
          >
            <RotateCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden="true" />
          </Button>
          {/* A Link rather than <Button asChild>: Slot counts the `null` children
              Button always renders and rejects them — see ASK 4 in fetch-sync.md. */}
          <Link href="/accounts/import" className={cn(buttonVariants({ variant: 'secondary' }))}>
            <Upload className="size-4" aria-hidden="true" />
            <span>IMPORT</span>
          </Link>
          <Button
            variant="secondary"
            label="Export"
            onClick={onExport}
            disabled={exporting}
            aria-label="Export the filtered fixtures as CSV"
          >
            <Download className="size-4" aria-hidden="true" />
          </Button>
        </>
      }
    />
  )
}

const WHEN_OPTIONS: FilterOption[] = [
  { value: 'upcoming', label: 'Upcoming only' },
  { value: 'past', label: 'Past' },
]

const CLUB_OPTIONS: FilterOption[] = CLUBS.map((club) => ({
  value: club.id,
  label: club.name,
  icon: <ClubBadge club={club.id} variant="crest-only" size="sm" />,
}))

const COMPETITION_OPTIONS: FilterOption[] = COMPETITION_IDS.map((id) => ({
  value: id,
  label: COMPETITION_LABEL[id],
}))
