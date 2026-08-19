'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { DataTable, type RowSelectionState } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { PageHeader } from '@/components/shell/PageHeader'
import { useAccounts } from '@/lib/api/hooks/useAccounts'
import {
  fetchAllMatchingListings,
  useBulkListings,
  useListingsTable,
  useRepriceListings,
  useUpdateListing,
} from '@/lib/api/hooks/useListings'
import type { Listing } from '@/lib/types'

import { ListingCard } from './ListingCard'
import { ListingRowActions } from './ListingRowActions'
import { ListingsBulkBar } from './ListingsBulkBar'
import { NoListingsMatch, NoListingsYet } from './ListingsEmpty'
import { ListingsToolbar } from './ListingsToolbar'
import { priceOrderLooksBroken } from './currency'
import { makeListingColumns } from './columns'
import { fieldForColumnId } from './sorting'
import { useListingsUrlState } from './url-state'

/**
 * `/mylistings` (§8.6) — every active listing across every marketplace, in one table.
 *
 * The screen exists for one question: is anything mispriced right now. So PRICE is
 * editable in place (see PriceCell), the currency normaliser makes a mixed-currency
 * column comparable at a glance, and the platform chips cut to one marketplace in a
 * single click. Everything else is the same grammar /accounts and /mytickets already
 * set — server paging, server sorting from the headers, a page-scoped selection with
 * one explicit escalation, and every filter in the URL.
 */

/**
 * Eleven mono columns do not fit at 1440 with the rail open. §9 rule 3 names the
 * column picker as the sanctioned fix, so the two an operator does not scan when
 * hunting a mispriced listing start hidden and `VIEW` reports "(2 hidden)". Nothing
 * is lost; it is one click.
 */
const HIDDEN_COLUMNS = ['rank', 'block']

export function ListingsScreen() {
  const router = useRouter()
  const state = useListingsUrlState()

  const listings = useListingsTable(state.filters)
  const meta = listings.query.data?.meta ?? null
  const matchingTotal = meta?.total ?? listings.total

  /**
   * One accounts query for the whole screen: the ACCOUNT column and the picker in the
   * toolbar read the same cached list rather than one request per row. `GET /listings`
   * only carries an opaque `accountId`.
   */
  const accountsQuery = useAccounts({ pageSize: 200, sort: 'email', order: 'asc' })
  const accountById = React.useMemo(
    () => new Map((accountsQuery.data?.data ?? []).map((account) => [account.id, account])),
    [accountsQuery.data],
  )

  /* ------------------------------------------------------------ selection */

  const [selection, setSelection] = React.useState<RowSelectionState>({})
  /** Non-null once the operator escalates past the page. Holds the real rows. */
  const [allMatching, setAllMatching] = React.useState<Listing[] | null>(null)
  const [escalating, setEscalating] = React.useState(false)

  const escalatedRef = React.useRef(false)
  React.useEffect(() => {
    escalatedRef.current = allMatching !== null
  }, [allMatching])

  // A selection only means anything against the filters it was made under.
  const filterKey = JSON.stringify(state.unpagedFilters)
  React.useEffect(() => {
    setSelection({})
    setAllMatching(null)
  }, [filterKey])

  // Paging invalidates a page-scoped selection but not an escalated one.
  React.useEffect(() => {
    if (!escalatedRef.current) setSelection({})
  }, [state.page, state.size])

  // While escalated, every page that loads shows as selected — because it is.
  React.useEffect(() => {
    if (!allMatching) return
    setSelection(Object.fromEntries(listings.rows.map((row) => [row.id, true])))
  }, [allMatching, listings.rows])

  const pageSelected = React.useMemo(
    () => listings.rows.filter((row) => selection[row.id]),
    [listings.rows, selection],
  )
  const selectedListings = allMatching ?? pageSelected

  const clearSelection = React.useCallback(() => {
    setSelection({})
    setAllMatching(null)
  }, [])

  const selectAllMatching = React.useCallback(async () => {
    setEscalating(true)
    try {
      setAllMatching(await fetchAllMatchingListings(state.unpagedFilters))
    } catch {
      toast.error('Could not load the full set. Nothing was selected.')
    } finally {
      setEscalating(false)
    }
  }, [state.unpagedFilters])

  const escalation =
    !allMatching &&
    listings.rows.length > 0 &&
    pageSelected.length === listings.rows.length &&
    matchingTotal > pageSelected.length
      ? { total: matchingTotal, onSelectAllMatching: selectAllMatching, pending: escalating }
      : null

  /* ------------------------------------------------------------ mutations */

  const updateListing = useUpdateListing()
  const bulkListings = useBulkListings()
  const repriceListings = useRepriceListings()

  const updateMutate = updateListing.mutate
  const bulkMutate = bulkListings.mutate
  const repriceMutate = repriceListings.mutate

  const bulkBusy = bulkListings.isPending || repriceListings.isPending

  const failStatus = state.fail

  /**
   * The §8.6 inline price commit. `undo` carries the price that was on screen before
   * the edit, because only the row knows it — the toast's Undo re-PATCHes back to it
   * rather than poking the cache, since by then the server really does hold the new
   * value.
   */
  const commitPrice = React.useCallback(
    (listing: Listing, price: number) => {
      updateMutate({
        id: listing.id,
        patch: { price },
        fail: failStatus,
        undo: { price: listing.price },
      })
    },
    [updateMutate, failStatus],
  )

  const [deletingRow, setDeletingRow] = React.useState<Listing | null>(null)

  const renderActions = React.useCallback(
    (listing: Listing) => (
      <ListingRowActions
        listing={listing}
        onActivate={() => bulkMutate({ ids: [listing.id], action: 'activate' })}
        onDeactivate={() => bulkMutate({ ids: [listing.id], action: 'deactivate' })}
        onDelete={() => setDeletingRow(listing)}
      />
    ),
    [bulkMutate],
  )

  /**
   * Only annotate PRICE when the confusion is actually on screen: a normaliser is
   * active, the table IS sorted by price, and the converted figures really do break
   * the order. Without the sort check the note would appear whenever a normaliser is
   * on — the rows are in some other order then, so "non-monotonic" is meaningless and
   * the note would be noise.
   */
  const priceOrderNote =
    state.sortSpec?.id === 'price' &&
    priceOrderLooksBroken(listings.rows, state.show, state.sortSpec.desc)

  const columns = React.useMemo(
    () =>
      makeListingColumns({
        accountById,
        show: state.show,
        onCommitPrice: commitPrice,
        renderActions,
        priceOrderNote,
      }),
    [accountById, state.show, commitPrice, renderActions, priceOrderNote],
  )

  /* ---------------------------------------------------------------- empty */

  // Zero listings anywhere is a different screen from zero matches, and it is
  // derivable rather than a second request: nothing matched AND nothing was asked for.
  const isFirstRun = !state.filtered && !listings.loading && matchingTotal === 0

  const setSelected = React.useCallback((id: string, checked: boolean) => {
    // Any hand-made change to the checkboxes drops the escalated set — the bar must
    // never claim 26 while the operator is picking rows.
    setAllMatching(null)
    setSelection((current) => {
      // RowSelectionState only ever holds `true`; an unselected row is an absent key.
      const next = { ...current }
      if (checked) next[id] = true
      else delete next[id]
      return next
    })
  }, [])

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Listings" subtitle="live_across_marketplaces" />

      <DataTable
        data={listings.rows}
        columns={columns}
        getRowId={(row) => row.id}
        noun="listing"
        loading={listings.loading}
        error={listings.error}
        onRetry={listings.onRetry}
        enableSelection
        selection={selection}
        onSelectionChange={(next) => {
          setAllMatching(null)
          setSelection(next)
        }}
        // A link that sorts by an initially-hidden column has to open with that column
        // visible, or the table is sorted by nothing on screen. `initiallyHidden` is
        // read once at mount, which is exactly when the incoming URL is known.
        initiallyHidden={HIDDEN_COLUMNS.filter((id) => id !== state.sortSpec.id)}
        // Server sorting. DataTable reports the column id; ./sorting.ts turns it into
        // the API field. DataTable follows this with onPageChange(1) in the same tick —
        // see the write-composition note in url-state.ts for why that does not clobber it.
        sorting={state.sortSpec}
        onSortingChange={(next) =>
          state.set(
            next
              ? { sort: fieldForColumnId(next.id), order: next.desc ? 'desc' : 'asc' }
              : // Clearing the sort still leaves the rows in the endpoint's own order,
                // so the header names that order rather than showing a neutral icon
                // over data that is plainly sorted.
                { sort: undefined, order: 'asc' },
          )
        }
        pageCount={meta?.totalPages ?? 1}
        totalRows={matchingTotal}
        page={state.page}
        onPageChange={(page) => state.set({ page })}
        onPageSizeChange={(size) => state.set({ size, page: 1 })}
        defaultPageSize={state.size}
        empty={
          isFirstRun ? (
            <NoListingsYet onBrowseTickets={() => router.push('/mytickets')} />
          ) : (
            <NoListingsMatch onClear={state.clearFilters} />
          )
        }
        renderCard={(row) => (
          <ListingCard
            listing={row}
            account={accountById.get(row.accountId)}
            show={state.show}
            selected={Boolean(selection[row.id])}
            onSelectedChange={(checked) => setSelected(row.id, checked)}
            onCommitPrice={(price) => commitPrice(row, price)}
            actions={renderActions(row)}
          />
        )}
        toolbar={
          <div className="space-y-3">
            <ListingsToolbar state={state} />

            <ListingsBulkBar
              listings={selectedListings}
              show={state.show}
              pageScoped={allMatching === null}
              escalation={escalation}
              escalated={allMatching !== null}
              onSelectPageOnly={() => setAllMatching(null)}
              busy={bulkBusy}
              onClear={clearSelection}
              onActivate={() =>
                bulkMutate({ ids: selectedListings.map((l) => l.id), action: 'activate' })
              }
              onDeactivate={() =>
                bulkMutate({ ids: selectedListings.map((l) => l.id), action: 'deactivate' })
              }
              onReprice={(changes) =>
                repriceMutate({
                  changes: changes.map((change) => ({ id: change.listing.id, price: change.to })),
                  fail: failStatus,
                })
              }
              onDelete={() =>
                bulkMutate(
                  { ids: selectedListings.map((l) => l.id), action: 'delete' },
                  { onSettled: clearSelection },
                )
              }
            />

            {/* §8.6 puts the total above the data. Rows per page sits beside it in
                DataTable's own VIEW popover, which renders on this same row. */}
            <p className="text-caption text-muted tabular-nums">
              Total {matchingTotal} {matchingTotal === 1 ? 'listing' : 'listings'}
              {state.filtered && ' matching these filters'}
            </p>
          </div>
        }
      />

      <ConfirmDialog
        open={deletingRow !== null}
        onOpenChange={(open) => !open && setDeletingRow(null)}
        verb="Delete"
        count={1}
        noun="listing"
        description={
          deletingRow
            ? `${deletingRow.listingId} is removed from ${deletingRow.fixtureName} on its marketplace. The tickets behind it are not deleted. This cannot be undone.`
            : ''
        }
        onConfirm={() => {
          if (deletingRow) bulkMutate({ ids: [deletingRow.id], action: 'delete' })
          setDeletingRow(null)
        }}
      />
    </div>
  )
}
