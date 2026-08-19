'use client'

import * as React from 'react'
import { Check, Play, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Prose } from '@/components/ui/typography'
import { BulkActionBar } from '@/components/data/BulkActionBar'
import { DataTable, type RowSelectionState } from '@/components/data/DataTable'
import { ALL, FilterSelect } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { AccountRowActions } from '@/components/accounts/AccountRowActions'
import { ImportWizardModal } from '@/components/import/ImportWizard'
import {
  fetchAllMatchingAccounts,
  useAccountAction,
  useAccountsTable,
  useCheckAccounts,
  useDeleteAccounts,
  useRevealPassword,
} from '@/lib/api/hooks/useAccounts'
import { useAccountResults } from '@/lib/api/hooks/useBallots'
import { useProxies, useTestProxy } from '@/lib/api/hooks/useDashboard'
import { ACCOUNT_STATUSES } from '@/components/domain/StatusChip'
import { upperSnake } from '@/lib/format/text'
import { BALLOT_CLUB_IDS, type Account, type AccountStatus, type BallotClubId } from '@/lib/types'

import { NoPoolYet, NothingMatches } from './empty-states'
import { makePoolColumns } from './pool-columns'
import { PasteLoader } from './PasteLoader'
import { sortFieldForColumn, type BallotsUrlState } from './url-state'

/**
 * §B5.1 — `// pool`, the accounts that can be entered into a ballot.
 *
 * The table is /accounts' table, filtered to the seven ballot clubs and given two
 * extra columns. It is not a copy: the columns, the cells, the row menu, the bulk
 * escalation and the password masking are all imported. A ballot account IS an
 * ordinary Account (§B3), and the moment this screen grew its own account table the
 * two would drift.
 *
 * The club filter is fixed to the seven. With no club chosen the request still names
 * all seven explicitly rather than omitting the filter, so an account belonging to
 * one of the other thirteen clubs can never appear here and be started by mistake.
 */

/** Hidden at 1440 so ACTIONS stays reachable — the /accounts reasoning, same table. */
const HIDDEN_COLUMNS = ['proxy']

export function PoolTab({
  state,
  onStartRun,
}: {
  state: BallotsUrlState
  /** Opens the launcher. `null` means "every eligible account", not a selection. */
  onStartRun: (accounts: Account[] | null) => void
}) {
  const accounts = useAccountsTable(state.poolFilters)
  const meta = accounts.query.data?.meta ?? null
  const matchingTotal = meta?.total ?? accounts.total

  const results = useAccountResults()
  const resultFor = React.useCallback(
    (accountId: string) => results.data?.get(accountId),
    [results.data],
  )

  const proxiesQuery = useProxies({ pageSize: 100, sort: 'label' })
  const proxyById = React.useMemo(
    () => new Map((proxiesQuery.data?.data ?? []).map((proxy) => [proxy.id, proxy])),
    [proxiesQuery.data],
  )

  /**
   * The emails already in the pool, for the loader's "already known" counter.
   *
   * Read once for the whole pool rather than per keystroke: the alternative is a
   * request for every line the operator pastes, which for 120 lines is 120 requests
   * to answer a question the browser can answer from one.
   */
  const [knownEmails, setKnownEmails] = React.useState<Set<string>>(new Set())
  const knownVersion = accounts.query.dataUpdatedAt

  React.useEffect(() => {
    let cancelled = false
    void fetchAllMatchingAccounts({ club: BALLOT_CLUB_IDS })
      .then((rows) => {
        if (!cancelled) setKnownEmails(new Set(rows.map((row) => row.email.toLowerCase())))
      })
      // The counter is an aid, not a gate — the server checks duplicates properly on
      // POST. If this fails the loader simply stops claiming anything is known.
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [knownVersion])

  /* ------------------------------------------------------------ selection */

  const [selection, setSelection] = React.useState<RowSelectionState>({})
  const [allMatching, setAllMatching] = React.useState<Account[] | null>(null)
  const [escalating, setEscalating] = React.useState(false)

  const escalatedRef = React.useRef(false)
  React.useEffect(() => {
    escalatedRef.current = allMatching !== null
  }, [allMatching])

  // A selection only means anything against the filters it was made under.
  const filterKey = JSON.stringify(state.poolFiltersUnpaged)
  React.useEffect(() => {
    setSelection({})
    setAllMatching(null)
  }, [filterKey])

  React.useEffect(() => {
    if (!escalatedRef.current) setSelection({})
  }, [state.page, state.size])

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
      setAllMatching(await fetchAllMatchingAccounts(state.poolFiltersUnpaged))
    } catch {
      toast.error('Could not load the full set. Nothing was selected.')
    } finally {
      setEscalating(false)
    }
  }, [state.poolFiltersUnpaged])

  const canEscalate =
    !allMatching &&
    accounts.rows.length > 0 &&
    pageSelected.length === accounts.rows.length &&
    matchingTotal > pageSelected.length

  /* ------------------------------------------------------------ mutations */

  const accountAction = useAccountAction()
  const checkAccounts = useCheckAccounts()
  const deleteAccounts = useDeleteAccounts()
  const testProxy = useTestProxy()
  const revealFor = useRevealPassword()

  const busy = checkAccounts.isPending || deleteAccounts.isPending

  const [deletingRow, setDeletingRow] = React.useState<Account | null>(null)
  const [confirmingBulkDelete, setConfirmingBulkDelete] = React.useState(false)
  const [importClub, setImportClub] = React.useState<BallotClubId | null>(null)

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
        onEdit={() => setImportClub(account.club as BallotClubId)}
        onCopyCredentials={() => void copyCredentials(account)}
        onDelete={() => setDeletingRow(account)}
      />
    ),
    [accountAction, testProxy, copyCredentials],
  )

  const columns = React.useMemo(
    () => makePoolColumns({ proxyById, resultFor, renderActions }),
    [proxyById, resultFor, renderActions],
  )

  /* ---------------------------------------------------------------- empty */

  // Nothing in the pool at all is a different screen from nothing matching a
  // filter: there is no filter apparatus to explain, only a loader to fill.
  const emptyPool = !accounts.loading && !accounts.error && matchingTotal === 0 && !state.filtered

  return (
    <div className="space-y-4">
      <PasteLoader knownEmails={knownEmails} onImportCsv={(club) => setImportClub(club)} />

      {emptyPool ? (
        <div className="rounded-lg border border-border bg-surface">
          <NoPoolYet />
        </div>
      ) : (
        <DataTable
          data={accounts.rows}
          columns={columns}
          getRowId={(row) => row.id}
          noun="account"
          loading={accounts.loading}
          error={accounts.error}
          onRetry={accounts.onRetry}
          enableSelection
          selection={selection}
          onSelectionChange={(next) => {
            // Any hand-made change drops the escalated set: the bar must never claim
            // 312 while the operator is picking rows.
            setAllMatching(null)
            setSelection(next)
          }}
          initiallyHidden={HIDDEN_COLUMNS.filter((id) => id !== state.sortSpec?.id)}
          sorting={state.sortSpec}
          onSortingChange={(next) =>
            state.set(
              next
                ? { sort: sortFieldForColumn('pool', next.id), order: next.desc ? 'desc' : 'asc' }
                : { sort: null, order: 'desc' },
            )
          }
          pageCount={meta?.totalPages ?? 1}
          totalRows={matchingTotal}
          page={state.page}
          onPageChange={(page) => state.set({ page })}
          onPageSizeChange={(size) => state.set({ size, page: 1 })}
          defaultPageSize={state.size}
          empty={<NothingMatches onClear={state.clearFilters} />}
          toolbar={
            <div className="space-y-3">
              <PoolToolbar
                state={state}
                total={matchingTotal}
                onStartRun={() => onStartRun(null)}
              />

              {selectedAccounts.length > 0 && (
                <div className="space-y-2">
                  <BulkActionBar
                    count={selectedAccounts.length}
                    noun="account"
                    pageScoped={allMatching === null}
                    onClear={clearSelection}
                  >
                    <Button
                      label="Start run"
                      count={selectedAccounts.length}
                      forward
                      size="sm"
                      onClick={() => onStartRun(selectedAccounts)}
                    >
                      <Play aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      label="Check status"
                      disabled={busy}
                      onClick={() =>
                        checkAccounts.mutate({ ids: selectedAccounts.map((a) => a.id) })
                      }
                    >
                      <RefreshCw
                        className={cn('size-4', checkAccounts.isPending && 'animate-spin')}
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      label="Delete"
                      count={selectedAccounts.length}
                      disabled={busy}
                      onClick={() => setConfirmingBulkDelete(true)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </BulkActionBar>

                  {/* The Part 4 escalation, unchanged: a bulk action never runs on a
                      set whose size the operator cannot see. */}
                  {canEscalate && (
                    <button
                      type="button"
                      onClick={() => void selectAllMatching()}
                      disabled={escalating}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-body text-primary-ink transition-colors duration-150 hover:bg-primary/10 disabled:opacity-60"
                    >
                      {escalating
                        ? 'Selecting the whole set…'
                        : `Select all ${matchingTotal} accounts matching these filters`}
                    </button>
                  )}

                  {allMatching !== null && (
                    <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-4 py-2 text-body text-primary-ink">
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                      <span>
                        All {allMatching.length} accounts matching these filters are selected,
                        across every page.
                      </span>
                      <button
                        type="button"
                        onClick={() => setAllMatching(null)}
                        className="underline underline-offset-4 hover:text-text"
                      >
                        Select this page only
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />
      )}

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

      {/* §B7 rule 6 — a destructive action names its own scale. */}
      <ConfirmDialog
        open={confirmingBulkDelete}
        onOpenChange={setConfirmingBulkDelete}
        verb="Delete"
        count={selectedAccounts.length}
        noun="account"
        description={`${selectedAccounts.length} accounts and their stored credentials are removed from the pool. This cannot be undone.`}
        onConfirm={() => {
          deleteAccounts.mutate(
            { ids: selectedAccounts.map((a) => a.id) },
            { onSettled: clearSelection },
          )
          setConfirmingBulkDelete(false)
        }}
      />

      {/* The same ImportWizard /accounts uses, opened with the club already chosen. */}
      <ImportWizardModal
        open={importClub !== null}
        onOpenChange={(open) => !open && setImportClub(null)}
        defaultTab="bulk"
      />
    </div>
  )
}

function PoolToolbar({
  state,
  total,
  onStartRun,
}: {
  state: BallotsUrlState
  total: number
  onStartRun: () => void
}) {
  return (
    <Toolbar
      search={
        <ToolbarSearch
          value={state.searchInput}
          onChange={state.setSearchInput}
          placeholder="Search the pool"
        />
      }
      filters={
        <>
          <FilterSelect
            value={state.club ?? ALL}
            onChange={(value) =>
              state.set({ club: value === ALL ? null : (value as BallotClubId) })
            }
            noun="ballot clubs"
            options={BALLOT_CLUB_IDS.map((id) => ({
              value: id,
              // Club names are domain data and render verbatim.
              label: '',
              icon: <ClubBadge club={id} variant="full" size="sm" />,
            }))}
          />
          <FilterSelect
            value={state.status ?? ALL}
            onChange={(value) =>
              state.set({ status: value === ALL ? null : (value as AccountStatus) })
            }
            noun="statuses"
            options={ACCOUNT_STATUSES.map((status) => ({
              value: status,
              label: upperSnake(status),
            }))}
          />
          {state.filtered && (
            <Button variant="ghost" size="sm" label="Clear" onClick={state.clearFilters} />
          )}
        </>
      }
      actions={
        <>
          <Prose className="hidden text-caption text-faint lg:block">
            {total} eligible {total === 1 ? 'account' : 'accounts'}
          </Prose>
          <Button label="Start run" forward disabled={total === 0} onClick={onStartRun}>
            <Play aria-hidden="true" />
          </Button>
        </>
      }
    />
  )
}
