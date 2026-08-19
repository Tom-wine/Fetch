'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SearchX, Ticket } from 'lucide-react'

import { DataTable, type SortSpec } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import { PageHeader } from '@/components/shell/PageHeader'
import { useAllFixtures, useFixturesPage, useRefreshFixtures } from '@/lib/api/hooks/useFixtures'
import { FIXTURE_COLUMNS, INITIALLY_HIDDEN } from './columns'
import { FixtureCard } from './FixtureCard'
import { FixturesGrid } from './FixturesGrid'
import { FixturesToolbar } from './FixturesToolbar'
import { downloadCsv, exportFilename, fixturesToCsv } from './export'
import { toFixtureFilters, useFixtureFilters } from './filters'
import { columnIdForField, DEFAULT_SORT_FIELD, fieldForColumnId } from './sorting'

/**
 * `/mytickets` — the inventory, one row per FIXTURE (§8.4).
 *
 * The screen owns no filter state of its own: `useFixtureFilters` reads the URL,
 * `toFixtureFilters` turns it into the §6.3 query, and everything on screen is
 * derived from that one value. Paging is server-driven, so the footer's
 * `Total N fixtures` is the API's count and not the length of the loaded page.
 */
export function MyTicketsScreen() {
  const router = useRouter()
  const filters = useFixtureFilters()
  const { state, set, clear, activeCount } = filters

  const query = React.useMemo(() => toFixtureFilters(state), [state])
  const fixtures = useFixturesPage(query)

  const { refresh, refreshing } = useRefreshFixtures()
  const allFixtures = useAllFixtures()
  const [exporting, setExporting] = React.useState(false)

  const onExport = React.useCallback(async () => {
    setExporting(true)
    try {
      // The whole filtered set, not the page on screen — an export that silently
      // stops at row 25 is worse than no export.
      const rows = await allFixtures(query)
      if (rows.length === 0) {
        toast.error('There are no fixtures to export with these filters.')
        return
      }
      downloadCsv(exportFilename(), fixturesToCsv(rows))
      toast.success(`${rows.length} ${rows.length === 1 ? 'fixture' : 'fixtures'} exported.`)
    } catch {
      toast.error('The export failed. Nothing was downloaded.')
    } finally {
      setExporting(false)
    }
  }, [allFixtures, query])

  /**
   * The header sort and the toolbar control are the same state: the URL's `sort` /
   * `order`, which the API orders by. DataTable emits the column id, so it is mapped
   * back to the field path here.
   *
   * A third click clears the sort, and clearing means returning to §8.4's default —
   * kickoff ascending — rather than to an unspecified order. The list always has an
   * order; pretending otherwise would leave the header unlit while the rows were
   * still sorted.
   */
  const sorting = React.useMemo(
    () => ({ id: columnIdForField(state.sort), desc: state.order === 'desc' }),
    [state.order, state.sort],
  )

  const onSortingChange = React.useCallback(
    (next: SortSpec | null) => {
      set(
        next
          ? { sort: fieldForColumnId(next.id), order: next.desc ? 'desc' : 'asc' }
          : { sort: DEFAULT_SORT_FIELD, order: 'asc' },
      )
    },
    [set],
  )

  const toolbar = (
    <FixturesToolbar
      filters={filters}
      onRefresh={() => void refresh()}
      onRefreshProvider={(label) => void refresh(label)}
      refreshing={refreshing}
      onExport={() => void onExport()}
      exporting={exporting}
    />
  )

  // Two different empty states, because they need two different next actions: a
  // filter that matched nothing is fixed by clearing it, an empty account is fixed by
  // importing accounts.
  const empty =
    activeCount > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No fixtures match"
        body="Nothing in the inventory matches these filters. Clear them to see everything Fetch.io is holding."
        action={<Button variant="secondary" label="Clear filters" onClick={clear} />}
        glyph="brackets"
      />
    ) : (
      <EmptyState
        icon={Ticket}
        title="No tickets yet"
        body="Import accounts and Fetch.io will pull in what they own — every fixture, every seat, every face value."
        // Links, not <Button asChild>: Slot rejects the `null` children Button
        // always renders (ASK 4 in fetch-sync.md).
        action={
          <Link href="/accounts" className={buttonVariants()}>
            <span>IMPORT_ACCOUNTS</span>
            <span aria-hidden="true">→</span>
          </Link>
        }
        secondaryAction={
          <Link href="/accounts/import" className={buttonVariants({ variant: 'secondary' })}>
            <span>IMPORT_CSV</span>
          </Link>
        }
      />
    )

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="My Tickets"
        subtitle="what_you_hold_and_what_is_at_risk"
        actions={<PrivacyToggle />}
      />

      {state.view === 'grid' ? (
        <FixturesGrid
          fixtures={fixtures.rows}
          loading={fixtures.loading}
          error={fixtures.error}
          onRetry={fixtures.onRetry}
          empty={empty}
          total={fixtures.total}
          page={fixtures.page}
          pageCount={fixtures.totalPages}
          onPageChange={(page) => set({ page })}
          toolbar={toolbar}
        />
      ) : (
        <DataTable
          data={fixtures.rows}
          columns={FIXTURE_COLUMNS}
          getRowId={(fixture) => fixture.id}
          noun="fixture"
          loading={fixtures.loading}
          error={fixtures.error}
          onRetry={fixtures.onRetry}
          empty={empty}
          onRowClick={(fixture) => router.push(`/mytickets/fixture/${fixture.id}`)}
          initiallyHidden={INITIALLY_HIDDEN}
          defaultPageSize={state.pageSize}
          defaultDensity="comfortable"
          pageCount={fixtures.totalPages}
          totalRows={fixtures.total}
          page={fixtures.page}
          onPageChange={(page) => set({ page })}
          onPageSizeChange={(pageSize) => set({ pageSize })}
          sorting={sorting}
          onSortingChange={onSortingChange}
          renderCard={(fixture) => (
            <FixtureCard fixture={fixture} linked={false} className="border-0 bg-transparent p-0" />
          )}
          toolbar={toolbar}
        />
      )}
    </div>
  )
}
