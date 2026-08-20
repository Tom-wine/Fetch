'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { DataTable, type RowSelectionState } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import {
  fetchAllMatchingAccounts,
  useAccountAction,
  useAccountFacets,
  useAccountTags,
  useAccountsTable,
  useAssignProxy,
  useCheckAccounts,
  useDeleteAccounts,
  useRevealPassword,
  useTagAccounts,
} from '@/lib/api/hooks/useAccounts'
import { useProxies, useTestProxy } from '@/lib/api/hooks/useDashboard'
import { ImportWizardModal } from '@/components/import/ImportWizard'
import { getClub } from '@/lib/registries/clubs'
import type { Account, Proxy } from '@/lib/types'

import { AccountCard } from './AccountCard'
import { AccountRowActions } from './AccountRowActions'
import { AccountsBulkBar } from './AccountsBulkBar'
import { AccountsToolbar, AccountsToolbarActions } from './AccountsToolbar'
import { AddAccountSheet } from './AccountSheets'
import { ClubTabs } from './ClubTabs'
import { NoAccountsMatch, NoAccountsYet } from './AccountsEmpty'
import { StatusFilterChips } from './StatusFilterChips'
import { downloadCsv, type CsvColumn } from './export-csv'
import { makeAccountColumns } from './columns'
import { sortFieldForColumn } from './sorting'
import { useAccountsUrlState } from './url-state'

/**
 * The anchor screen (§8.2) — the reason the operator opens the app before an on-sale.
 *
 * Every filter, sort, page and tab value is in the query string (see url-state.ts),
 * so the view is shareable and survives a refresh. The table is server-paged, which
 * makes selection the interesting problem: see AccountsBulkBar for why the header
 * checkbox is page-scoped and how the escalation to "all 64 matching" works.
 */

/**
 * Headers match §8.3's import template where the fields overlap, so a file exported
 * here re-imports without remapping a single column. `password` is deliberately
 * absent — see export-csv.ts.
 */
function makeCsvColumns(proxyById: Map<string, Proxy>): Array<CsvColumn<Account>> {
  return [
    { header: 'email', value: (a) => a.email },
    { header: 'first_name', value: (a) => a.firstName },
    { header: 'last_name', value: (a) => a.lastName },
    { header: 'club', value: (a) => getClub(a.club).name },
    { header: 'membership_type', value: (a) => a.membershipType },
    { header: 'membership_id', value: (a) => a.membershipId },
    { header: 'phone', value: (a) => a.phone },
    { header: 'loyalty_points', value: (a) => a.loyaltyPoints },
    { header: 'tickets_purchased', value: (a) => a.ticketsPurchased },
    { header: 'status', value: (a) => a.status },
    { header: 'proxy', value: (a) => (a.proxyId ? (proxyById.get(a.proxyId)?.label ?? '') : '') },
    { header: 'last_checked_at', value: (a) => a.lastCheckedAt },
    { header: 'tags', value: (a) => a.tags.join('|') },
    { header: 'notes', value: (a) => a.notes },
  ]
}

/**
 * Hidden on first render so the default set FITS — §9 rule 3: hide columns, never shrink
 * type. LOYALTY, TICKETS and PROXY keep ACTIONS on screen at 1440; PASSWORD is what made
 * the table fit at 1280, where the other seven wanted 1105px in a 974px pane.
 *
 * PASSWORD is the right one to lose. A constant-width ten-bullet mask carries no
 * information at a glance — every row is identical by design — and the column's whole
 * purpose is reveal-on-demand, which the row menu already serves through Copy
 * credentials. It is one click away in VIEW for anyone who wants the eye back.
 */
const HIDDEN_COLUMNS = ['loyalty', 'tickets', 'proxy', 'password']

export function AccountsTab() {
  const state = useAccountsUrlState()

  const statsQuery = useAccountFacets()
  const stats = statsQuery.data ?? null

  const accounts = useAccountsTable(state.filters)
  const meta = accounts.query.data?.meta ?? null
  const matchingTotal = meta?.total ?? accounts.total

  // One proxy query for the whole screen: the PROXY column and the bulk assign
  // popover read the same cached list rather than one request per row.
  const proxiesQuery = useProxies({ pageSize: 100, sort: 'label' })
  const proxies = React.useMemo(() => proxiesQuery.data?.data ?? [], [proxiesQuery.data])
  const proxyById = React.useMemo(
    () => new Map(proxies.map((proxy) => [proxy.id, proxy])),
    [proxies],
  )

  const knownTags = useAccountTags().data ?? []

  /* ------------------------------------------------------------ selection */

  const [selection, setSelection] = React.useState<RowSelectionState>({})
  /** Non-null once the operator escalates past the page. Holds the real rows. */
  const [allMatching, setAllMatching] = React.useState<Account[] | null>(null)
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
    setSelection(Object.fromEntries(accounts.rows.map((row) => [row.id, true])))
  }, [allMatching, accounts.rows])

  const pageSelected = React.useMemo(
    () => accounts.rows.filter((row) => selection[row.id]),
    [accounts.rows, selection],
  )
  const selectedAccounts = allMatching ?? pageSelected

  const clearSelection = React.useCallback(() => {
    setSelection({})
    setAllMatching(null)
  }, [])

  const selectAllMatching = React.useCallback(async () => {
    setEscalating(true)
    try {
      setAllMatching(await fetchAllMatchingAccounts(state.unpagedFilters))
    } catch {
      toast.error('Could not load the full set. Nothing was selected.')
    } finally {
      setEscalating(false)
    }
  }, [state.unpagedFilters])

  const escalation =
    !allMatching &&
    accounts.rows.length > 0 &&
    pageSelected.length === accounts.rows.length &&
    matchingTotal > pageSelected.length
      ? { total: matchingTotal, onSelectAllMatching: selectAllMatching, pending: escalating }
      : null

  /* ------------------------------------------------------------ mutations */

  const accountAction = useAccountAction()
  const checkAccounts = useCheckAccounts()
  const assignProxy = useAssignProxy()
  const tagAccounts = useTagAccounts()
  const deleteAccounts = useDeleteAccounts()
  const testProxy = useTestProxy()
  const revealFor = useRevealPassword()

  const bulkBusy =
    checkAccounts.isPending ||
    assignProxy.isPending ||
    tagAccounts.isPending ||
    deleteAccounts.isPending

  /* --------------------------------------------------------------- export */

  const [exporting, setExporting] = React.useState(false)
  const csvColumns = React.useMemo(() => makeCsvColumns(proxyById), [proxyById])

  const exportRows = React.useCallback(
    (rows: Account[]) => downloadCsv(`fetch-accounts-${rows.length}.csv`, csvColumns, rows),
    [csvColumns],
  )

  /** The toolbar's Export writes the FILTERED set, not the page on screen. */
  const exportFiltered = React.useCallback(async () => {
    setExporting(true)
    try {
      const rows = await fetchAllMatchingAccounts(state.unpagedFilters)
      exportRows(rows)
      toast.success(`${rows.length} accounts exported.`)
    } catch {
      toast.error('The export could not be built. Nothing was downloaded.')
    } finally {
      setExporting(false)
    }
  }, [state.unpagedFilters, exportRows])

  /** `Check all` means all rows matching the current filters, not all 64. */
  const checkAllMatching = React.useCallback(async () => {
    try {
      const rows = await fetchAllMatchingAccounts(state.unpagedFilters)
      checkAccounts.mutate({ ids: rows.map((row) => row.id) })
    } catch {
      toast.error('Could not work out which accounts to check. Nothing was run.')
    }
  }, [state.unpagedFilters, checkAccounts])

  /* ----------------------------------------------------------- row action */

  const [deletingRow, setDeletingRow] = React.useState<Account | null>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null)
  const [importOpen, setImportOpen] = React.useState(false)

  /**
   * Copies without ever painting the password. The plaintext lives in this closure
   * for the length of a clipboard write and is never logged, stored or rendered.
   */
  const copyCredentials = React.useCallback(
    async (account: Account) => {
      try {
        const password = await revealFor(account.id)()
        await navigator.clipboard.writeText(`${account.email}\t${password}`)
        toast.success('Credentials copied. They were never shown on screen.')
      } catch {
        toast.error('Could not copy the credentials.')
      }
    },
    [revealFor],
  )

  const renderActions = React.useCallback(
    (account: Account) => (
      <AccountRowActions
        account={account}
        onAction={(action) => accountAction.mutate({ id: account.id, action })}
        onTestProxy={() => account.proxyId && testProxy.mutate({ id: account.proxyId })}
        onEdit={() => {
          setEditingAccount(account)
          setAddOpen(true)
        }}
        onCopyCredentials={() => void copyCredentials(account)}
        onDelete={() => setDeletingRow(account)}
      />
    ),
    [accountAction, testProxy, copyCredentials],
  )

  const columns = React.useMemo(
    () => makeAccountColumns({ proxyById, renderActions }),
    [proxyById, renderActions],
  )

  /* ---------------------------------------------------------------- empty */

  // Zero accounts in the whole system is a different screen from zero matches:
  // the filter apparatus is hidden entirely, because there is nothing to filter.
  const isFirstRun = stats !== null && stats.total === 0

  if (isFirstRun) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-surface">
          <NoAccountsYet
            onImport={() => setImportOpen(true)}
            onAddManually={() => {
              setEditingAccount(null)
              setAddOpen(true)
            }}
          />
        </div>
        <Sheets
          addOpen={addOpen}
          setAddOpen={setAddOpen}
          editingAccount={editingAccount}
          importOpen={importOpen}
          setImportOpen={setImportOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClubTabs
        counts={stats?.byClub ?? {}}
        total={stats?.total ?? 0}
        value={state.club}
        onChange={(club) => state.set({ club })}
        loading={statsQuery.isPending}
      />

      <StatusFilterChips
        counts={stats?.byStatus ?? {}}
        total={stats?.total ?? 0}
        value={state.status}
        onChange={(status) => state.set({ status })}
      />

      <DataTable
        data={accounts.rows}
        columns={columns}
        getRowId={(row) => row.id}
        noun="account"
        // The facet counts decide whether this is "no accounts yet" or "nothing
        // matches these filters", so until they land the table is still loading.
        // Rendering "nothing matches" at a brand-new operator, under a toolbar full
        // of filters they never touched, would be a lie with a bad first impression.
        loading={accounts.loading || statsQuery.isPending}
        error={accounts.error}
        onRetry={accounts.onRetry}
        enableSelection
        selection={selection}
        onSelectionChange={(next) => {
          // Any hand-made change to the checkboxes drops the escalated set — the
          // bar must never claim 64 while the operator is picking rows.
          setAllMatching(null)
          setSelection(next)
        }}
        // Mono runs ~12% wider than a proportional face, so all ten columns need
        // 1245px and there are 1107 at 1440 with the rail open — which pushes
        // ACTIONS off the right edge, i.e. the row menu becomes unreachable without
        // scrolling. §9 rule 3 names the column picker as the sanctioned fix, so the
        // three columns an operator does not scan before an on-sale start hidden and
        // the VIEW button reports "(3 hidden)". Nothing is lost; it is one click.
        // ...unless the link being opened sorts by one of them. Landing on rows
        // ordered by a column that is not on screen is a table sorted by nothing
        // visible. `initiallyHidden` is read once at mount, which is exactly the
        // moment the incoming URL is known.
        initiallyHidden={HIDDEN_COLUMNS.filter((id) => id !== state.sortSpec?.id)}
        // Server sorting. DataTable reports the column id; ./sorting.ts turns it into
        // the API field, and the same query params the under-`md` control writes.
        // DataTable follows this with onPageChange(1) in the same tick — see the
        // write-composition note in url-state.ts for why that does not clobber it.
        sorting={state.sortSpec}
        onSortingChange={(next) =>
          state.set(
            next
              ? { sort: sortFieldForColumn(next.id), order: next.desc ? 'desc' : 'asc' }
              : { sort: null, order: 'asc' },
          )
        }
        pageCount={meta?.totalPages ?? 1}
        totalRows={matchingTotal}
        page={state.page}
        onPageChange={(page) => state.set({ page })}
        onPageSizeChange={(size) => state.set({ size, page: 1 })}
        defaultPageSize={state.size}
        empty={<NoAccountsMatch onClear={state.clearFilters} />}
        renderCard={(row) => (
          <AccountCard
            account={row}
            selected={Boolean(selection[row.id])}
            onSelectedChange={(checked) => {
              setAllMatching(null)
              setSelection((current) => {
                // RowSelectionState only ever holds `true` — an unselected row is an
                // absent key, not a `false` one.
                const next = { ...current }
                if (checked) next[row.id] = true
                else delete next[row.id]
                return next
              })
            }}
            actions={renderActions(row)}
          />
        )}
        toolbar={
          <div className="space-y-3">
            <AccountsToolbar state={state} tags={knownTags} />
            <AccountsBulkBar
              accounts={selectedAccounts}
              pageScoped={allMatching === null}
              escalation={escalation}
              escalated={allMatching !== null}
              onSelectPageOnly={() => setAllMatching(null)}
              proxies={proxies}
              knownTags={knownTags}
              busy={bulkBusy}
              onClear={clearSelection}
              onCheckStatus={() => checkAccounts.mutate({ ids: selectedAccounts.map((a) => a.id) })}
              onAssignProxy={(proxyId) =>
                assignProxy.mutate({ ids: selectedAccounts.map((a) => a.id), proxyId })
              }
              onAddTag={(tag) => tagAccounts.mutate({ accounts: selectedAccounts, tag })}
              onExport={() => exportRows(selectedAccounts)}
              onDelete={() =>
                deleteAccounts.mutate(
                  { ids: selectedAccounts.map((a) => a.id) },
                  { onSettled: clearSelection },
                )
              }
            />
          </div>
        }
        toolbarActions={
          <AccountsToolbarActions
            matchingCount={matchingTotal}
            onCheckAll={() => void checkAllMatching()}
            checking={checkAccounts.isPending}
            onAdd={() => {
              setEditingAccount(null)
              setAddOpen(true)
            }}
            onImport={() => setImportOpen(true)}
            onExport={() => void exportFiltered()}
            exporting={exporting}
          />
        }
      />

      <ConfirmDialog
        open={deletingRow !== null}
        onOpenChange={(open) => !open && setDeletingRow(null)}
        verb="Delete"
        count={1}
        noun="account"
        description={
          deletingRow
            ? `${deletingRow.email} and its stored credentials are removed. This cannot be undone.`
            : ''
        }
        onConfirm={() => {
          if (deletingRow) deleteAccounts.mutate({ ids: [deletingRow.id] })
          setDeletingRow(null)
        }}
      />

      <Sheets
        addOpen={addOpen}
        setAddOpen={setAddOpen}
        editingAccount={editingAccount}
        importOpen={importOpen}
        setImportOpen={setImportOpen}
      />
    </div>
  )
}

function Sheets({
  addOpen,
  setAddOpen,
  editingAccount,
  importOpen,
  setImportOpen,
}: {
  addOpen: boolean
  setAddOpen: (open: boolean) => void
  editingAccount: Account | null
  importOpen: boolean
  setImportOpen: (open: boolean) => void
}) {
  return (
    <>
      <AddAccountSheet open={addOpen} onOpenChange={setAddOpen} account={editingAccount} />
      {/* The toolbar's IMPORT and the /accounts/import route render the SAME
          ImportWizard — see components/import/ImportWizard.tsx. */}
      <ImportWizardModal open={importOpen} onOpenChange={setImportOpen} />
    </>
  )
}
