'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Armchair, SearchX } from 'lucide-react'

import { DataTable, type SortSpec } from '@/components/data/DataTable'
import { EmptyState, ErrorState } from '@/components/data/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { useFixture } from '@/lib/api/hooks/useFixtures'
import {
  useAccountBook,
  useAccountMaintenance,
  useFixtureFacets,
  useFixtureTicketsPage,
  useRefreshTickets,
  useSetTicketVisibility,
} from '@/lib/api/hooks/useFixtureDetail'
import type { Ticket } from '@/lib/types'
import { DetailPanel } from './DetailPanel'
import { FixtureHeader, FixtureHeaderSkeleton } from './FixtureHeader'
import { TicketActions } from './TicketActions'
import { TicketCard } from './TicketCard'
import { TicketsToolbar } from './TicketsToolbar'
import { INITIALLY_HIDDEN, ticketColumns } from './columns'
import { useSeatSelection } from './selection'
import { DEFAULT_SORT_FIELD, fieldForColumnId } from './sorting'
import { useFixtureDetailUrlState } from './url-state'

/**
 * `/mytickets/fixture/[id]` — §8.5, the core screen.
 *
 * Two panes at 1280px and up: the seat table on the left at ~64%, the context panel on
 * the right at ~36%. Below that the panel stacks under the table at full width rather
 * than being squeezed — §9 rule 2, and the reason the panel's tab labels are
 * `whitespace-nowrap`: the screen this replaces rendered `Seat Map` as `Sea`.
 *
 * Everything the operator is LOOKING AT lives in the URL, so the view is shareable.
 * Everything they are DOING — the selection — lives in React, because it changes on
 * every click and a history entry per click would bury the page they came from.
 */
export function FixtureDetailScreen() {
  // Read here rather than awaited in the page: see the note in that route file. An
  // `await params` in the page suspends the server render and renumbers every
  // `useId` above this screen; `useParams` is synchronous on both renders.
  const { id: fixtureId } = useParams<{ id: string }>()
  const url = useFixtureDetailUrlState(fixtureId)

  const fixtureQuery = useFixture(fixtureId)
  const fixture = fixtureQuery.data?.data ?? null

  const tickets = useFixtureTicketsPage(fixtureId, url.filters)
  const facets = useFixtureFacets(fixtureId)
  const accounts = useAccountBook()

  const { refresh, refreshing } = useRefreshTickets()
  const visibility = useSetTicketVisibility()
  const maintenance = useAccountMaintenance()

  const selection = useSeatSelection(tickets.rows, url.autoGroup)

  const onToggleVisibility = React.useCallback(
    (ticket: Ticket) => visibility.toggle(ticket),
    [visibility],
  )

  const columns = React.useMemo(
    () =>
      ticketColumns({
        accounts: accounts.byId,
        onToggleVisibility,
        visibilityBusy: visibility.isPending,
      }),
    [accounts.byId, onToggleVisibility, visibility.isPending],
  )

  /**
   * The header sort and the small-screen control are the same state: the URL's
   * `sort` / `order`, which the API orders by. DataTable emits a column id, so it is
   * mapped back through the registry here. A third click clears the sort, and clearing
   * means returning to the endpoint's own order — a list always has one.
   */
  const onSortingChange = React.useCallback(
    (next: SortSpec | null) => {
      url.set(
        next
          ? { sort: fieldForColumnId(next.id), order: next.desc ? 'desc' : 'asc' }
          : { sort: DEFAULT_SORT_FIELD, order: 'asc' },
      )
    },
    [url],
  )

  const onMaintenance = React.useCallback(
    (action: 'relogin' | 'reset-password') => {
      const ids = [...new Set(selection.selectedTickets.map((t) => t.accountId))]
      if (ids.length === 0) return
      maintenance.mutate({ ids, action })
    },
    [maintenance, selection.selectedTickets],
  )

  /* ---------------------------------------------------- fixture states */

  if (fixtureQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <FixtureHeaderSkeleton />
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="h-64 animate-pulse rounded-md bg-surface-raised" />
        </div>
      </div>
    )
  }

  if (!fixture) {
    return (
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState
            title="Fixture not found"
            message={
              fixtureQuery.error?.message ??
              'That fixture is not in the inventory. It may have been removed since the link was made.'
            }
            onRetry={() => void fixtureQuery.refetch()}
          />
          <div className="flex justify-center pb-8">
            <Link href="/mytickets" className={buttonVariants({ variant: 'secondary' })}>
              <span>BACK_TO_MY_TICKETS</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------- table */

  const toolbar = (
    <TicketsToolbar
      url={url}
      accounts={accounts.byId}
      accountIds={facets.accountIds}
      blocks={facets.blocks}
      rows={facets.rows}
      selected={selection.selectedTickets}
      fixtureTickets={facets.tickets}
      actionsMenu={
        <TicketActions
          fixture={fixture}
          tickets={selection.selectedTickets}
          accounts={accounts.byId}
          onCleared={selection.clear}
        />
      }
      onRefresh={() => void refresh()}
      refreshing={refreshing}
      onMaintenance={onMaintenance}
      maintenanceBusy={maintenance.isPending}
    />
  )

  // Two empty states, because they need two different next actions: filters that
  // matched nothing are fixed by clearing them, a fixture with no seats is fixed by
  // importing the accounts that hold them.
  const empty =
    url.activeCount > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No seats match"
        body="Nothing on this fixture matches these filters. Clear them to see every seat Fetch.io is holding."
        action={<Button variant="secondary" label="Clear filters" onClick={url.clearFilters} />}
        glyph="brackets"
      />
    ) : (
      <EmptyState
        icon={Armchair}
        title="No seats yet"
        body="Fetch.io is not holding any seats on this fixture. Import the accounts that bought them and they will appear here."
        action={
          // A Link, not `<Button asChild>`: the arrow and label are rendered inside the
          // anchor, which is what the buttonVariants class list is for.
          <Link href="/accounts/import" className={buttonVariants()}>
            <span>IMPORT_ACCOUNTS</span>
            <span aria-hidden="true">→</span>
          </Link>
        }
        secondaryAction={
          <Link href="/mytickets" className={buttonVariants({ variant: 'secondary' })}>
            <span>ALL_FIXTURES</span>
          </Link>
        }
      />
    )

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <FixtureHeader fixture={fixture} />

      {/*
        64 / 36 at xl (1280px) and one column below it. `minmax(0, …)` on both tracks
        is what stops a wide table from pushing the panel off the grid — without it a
        `fr` track refuses to shrink below its content and the panel gets clipped,
        which is exactly the failure §9 rule 2 exists to prevent.
      */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]">
        <div className="min-w-0" {...selection.containerProps}>
          <DataTable
            data={tickets.rows}
            columns={columns}
            getRowId={(ticket) => ticket.id}
            noun="ticket"
            loading={tickets.loading}
            error={tickets.error}
            onRetry={tickets.onRetry}
            empty={empty}
            enableSelection
            selection={selection.selection}
            onSelectionChange={selection.onSelectionChange}
            onRowClick={selection.onRowClick}
            initiallyHidden={INITIALLY_HIDDEN}
            pageSize={url.size}
            onPageSizeChange={(size) => url.set({ size })}
            pageCount={tickets.totalPages}
            totalRows={tickets.total}
            page={tickets.page}
            onPageChange={(page) => url.set({ page })}
            sorting={url.sortSpec}
            onSortingChange={onSortingChange}
            renderCard={(ticket) => (
              <TicketCard
                ticket={ticket}
                account={accounts.byId.get(ticket.accountId)}
                onToggleVisibility={onToggleVisibility}
                visibilityBusy={visibility.isPending}
              />
            )}
            toolbar={toolbar}
          />
        </div>

        {/*
          The grid row stretches both panes to the same height, so the panel is exactly
          as tall as the table beside it and its footer lands on the table's own footer
          line. A viewport-relative height was the obvious first try and is wrong: the
          panel starts ~230px down the page, so `100vh` minus a guess puts its footer
          below the fold until the page is scrolled.
        */}
        <DetailPanel
          fixture={fixture}
          selected={selection.selectedTickets}
          fixtureTickets={facets.tickets}
          tab={url.tab}
          onTabChange={(tab) => url.set({ tab })}
          className="min-h-[420px]"
        />
      </div>
    </div>
  )
}
