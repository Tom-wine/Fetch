'use client'

import * as React from 'react'
import {
  columnPinningFeature,
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type RowSelectionState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { snake, upperSnake } from '@/lib/format/text'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState, SkeletonTable } from './states'
import { ViewOptionsPopover, type ColumnToggle, type Density } from './ViewOptionsPopover'

/**
 * The workhorse (§7 #7), built on TanStack Table **v9**.
 *
 * v9 is not v8 with a new coat: features are registered explicitly through
 * `tableFeatures()`, row models are factories rather than `getXRowModel` options,
 * and state is read from `table.state` (there is no `getState()`). Everything below
 * is written against the installed 9.1.2 types.
 */

// Registered once at module scope — the helper is explicitly documented as static.
const features = tableFeatures({
  rowSelectionFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  columnPinningFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  // Type-only slot (v9 strips the value): declares the shape of `columnDef.meta`
  // for every column of this table, without global declaration merging.
  columnMeta: {} as ColumnMeta,
})

/**
 * Per-column metadata. `sortable` is how a column opts into SERVER sorting: the
 * table cannot know which of a screen's columns the API can actually order by, and
 * offering a header that silently sorts only the loaded page would be a lie.
 *
 * It is ignored in client mode, where every column is sortable as before.
 */
export interface ColumnMeta {
  sortable?: boolean
}

export type TableFeaturesOf = typeof features
export type FetchColumnDef<TData extends RowData> = ColumnDef<TableFeaturesOf, TData, unknown>
export type { RowSelectionState }

/** The single active sort, as the API expresses it (`?sort=email&order=desc`). */
export interface SortSpec {
  id: string
  desc: boolean
}

const SELECT_COLUMN_ID = '__select__'

export interface DataTableProps<TData extends RowData> {
  data: TData[]
  columns: FetchColumnDef<TData>[]
  /** Stable row identity — never the array index (§6.2: IDs are opaque strings). */
  getRowId: (row: TData) => string
  /** Singular noun for the `Total N <noun>` footer and the selection count. */
  noun: string

  loading?: boolean
  error?: string | null
  onRetry?: () => void
  /** Rendered in place of the table when there are no rows and no error. */
  empty?: React.ReactNode

  enableSelection?: boolean
  selection?: RowSelectionState
  onSelectionChange?: (selection: RowSelectionState) => void

  onRowClick?: (row: TData) => void

  /** Column ids hidden on first render — the fix when a table crowds at 1280px. */
  initiallyHidden?: string[]
  defaultPageSize?: number
  defaultDensity?: Density

  /* ---- server-driven pagination (all optional) ---------------------------
     Supplying `pageCount` switches the table into manual mode: `data` is taken
     to be exactly one page, nothing is sliced locally, and the footer reads from
     `totalRows` / `pageCount` instead of `data.length`. Omit them all and the
     table paginates client-side exactly as before.
     ---------------------------------------------------------------------- */

  /** Total pages, from the API's `meta.totalPages`. Presence enables manual mode. */
  pageCount?: number
  /** Total matching rows, from the API's `meta.total`. Drives the `Total N` footer. */
  totalRows?: number
  /** Current 1-based page, from the API's `meta.page`. */
  page?: number
  /** Emitted with the next 1-based page. The caller refetches. */
  onPageChange?: (page: number) => void
  /** Emitted when rows-per-page changes. The caller resets to page 1. */
  onPageSizeChange?: (size: number) => void

  /* ---- server-driven sorting (both optional) -----------------------------
     Supplying `onSortingChange` switches the table into manual sorting: the row
     model is left in the order the API returned it, and a header click is emitted
     upward as `{ id, desc } | null` instead of reordering the current page.

     Sorting only the loaded page would be a lie — the row that should be first is
     usually not on it — so this is the seam that lets §7 #7's sortable headers be
     honest against a paged endpoint.
     ---------------------------------------------------------------------- */

  /** The active sort, controlled by the caller. `null` means unsorted. */
  sorting?: SortSpec | null
  /** Emitted on a header click. Presence enables manual sorting. */
  onSortingChange?: (next: SortSpec | null) => void

  /** Renders one row as a card under `md`, where a table cannot fit (§9 rule 3). */
  renderCard?: (row: TData) => React.ReactNode

  /** Slot above the table: a <Toolbar>, a <BulkActionBar>, club tabs. */
  toolbar?: React.ReactNode
  /** Extra controls beside the view-options button. */
  toolbarActions?: React.ReactNode
  className?: string
}

export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  noun,
  loading = false,
  error = null,
  onRetry,
  empty,
  enableSelection = false,
  selection,
  onSelectionChange,
  onRowClick,
  initiallyHidden = [],
  defaultPageSize = 25,
  defaultDensity = 'comfortable',
  pageCount,
  totalRows,
  page,
  onPageChange,
  onPageSizeChange,
  sorting,
  onSortingChange,
  renderCard,
  toolbar,
  toolbarActions,
  className,
}: DataTableProps<TData>) {
  const [density, setDensity] = React.useState<Density>(defaultDensity)
  const [internalSelection, setInternalSelection] = React.useState<RowSelectionState>({})
  const rowSelection = selection ?? internalSelection
  const setRowSelection = onSelectionChange ?? setInternalSelection

  /**
   * Manual sorting is chosen by the caller supplying `onSortingChange`. In v9 that
   * means `manualSorting: true` plus a controlled `state.sorting` — the sorted row
   * model then leaves `data` in the order the API returned it.
   */
  const manualSort = onSortingChange !== undefined

  const allColumns = React.useMemo<FetchColumnDef<TData>[]>(() => {
    // Server sorting is opt-in per column: `getCanSort()` stays the single source
    // of truth for whether a header is clickable, so the header markup is unchanged.
    const base = manualSort
      ? columns.map((c) => ({ ...c, enableSorting: c.meta?.sortable === true }))
      : columns

    if (!enableSelection) return base
    const selectColumn: FetchColumnDef<TData> = {
      id: SELECT_COLUMN_ID,
      header: '',
      enableSorting: false,
      enableHiding: false,
    }
    return [selectColumn, ...base]
  }, [columns, enableSelection, manualSort])

  const initialVisibility = React.useMemo(
    () => Object.fromEntries(initiallyHidden.map((id) => [id, false])),
    // The initial hidden set is a mount-time decision; later changes come from the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /**
   * Manual mode is chosen by the caller supplying `pageCount`. In v9 that means
   * `manualPagination: true` plus `pageCount` / `rowCount` options — the paginated
   * row model then passes `data` through untouched, and `getPageCount()` and
   * `getRowCount()` resolve from those options rather than counting rows.
   */
  const manual = pageCount !== undefined

  // The server owns the page index in manual mode, so the table's own slice is
  // controlled from the `page` prop (1-based on the wire, 0-based in the table).
  const [uncontrolledPageSize, setUncontrolledPageSize] = React.useState(defaultPageSize)
  const controlledPagination = React.useMemo(
    () => ({ pageIndex: Math.max(0, (page ?? 1) - 1), pageSize: uncontrolledPageSize }),
    [page, uncontrolledPageSize],
  )

  const table = useTable({
    features,
    data,
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    enableRowSelection: enableSelection,
    state: {
      rowSelection,
      ...(manual ? { pagination: controlledPagination } : {}),
      ...(manualSort ? { sorting: sorting ? [sorting] : [] } : {}),
    },
    onRowSelectionChange: (updater) =>
      setRowSelection(typeof updater === 'function' ? updater(rowSelection) : updater),
    ...(manual
      ? {
          manualPagination: true,
          pageCount,
          rowCount: totalRows,
          onPaginationChange: (updater) => {
            const next = typeof updater === 'function' ? updater(controlledPagination) : updater
            if (next.pageSize !== controlledPagination.pageSize) {
              // Rows-per-page always returns to page 1 — page 9 of 13 is meaningless
              // once the page size changes under it.
              setUncontrolledPageSize(next.pageSize)
              onPageSizeChange?.(next.pageSize)
              onPageChange?.(1)
              return
            }
            if (next.pageIndex !== controlledPagination.pageIndex) {
              onPageChange?.(next.pageIndex + 1)
            }
          },
        }
      : {}),
    ...(manualSort
      ? {
          manualSorting: true,
          // One column at a time — the API contract takes a single `sort`/`order`
          // pair, so offering shift-click multi-sort would promise more than it can keep.
          enableMultiSort: false,
          // Keeps the third click in the cycle: asc → desc → none.
          enableSortingRemoval: true,
          // Without this, TanStack infers a descending first click for numeric
          // columns, so LOYALTY would cycle desc → asc → none while ACCOUNT cycled
          // asc → desc → none. One predictable direction beats a clever one.
          sortDescFirst: false,
          onSortingChange: (updater) => {
            const current = sorting ? [sorting] : []
            const next = typeof updater === 'function' ? updater(current) : updater
            const first = next[0] ?? null
            onSortingChange?.(first ? { id: first.id, desc: first.desc } : null)
            // A new sort reorders the whole result set, so page 9 of the old order
            // is meaningless. Emitted through the existing page callback.
            if (manual) onPageChange?.(1)
          },
        }
      : {}),
    initialState: {
      pagination: { pageIndex: 0, pageSize: defaultPageSize },
      columnVisibility: initialVisibility,
      // The first column is frozen (§9 rule 3) — pinning drives the sticky offset.
      columnPinning: { start: enableSelection ? [SELECT_COLUMN_ID] : [], end: [] },
    },
  })

  const pagination = table.state.pagination ?? { pageIndex: 0, pageSize: defaultPageSize }
  const rows = table.getRowModel().rows
  const total = manual ? (totalRows ?? rows.length) : table.getRowCount()
  const selectedCount = Object.values(rowSelection).filter(Boolean).length

  /**
   * Under server paging the header checkbox can only reach the rows currently
   * loaded, so the count says so out loud. Implying a cross-page selection the API
   * cannot honour is how a bulk delete quietly does the wrong thing.
   */
  const selectionSummary = manual
    ? `${selectedCount} selected on this page`
    : `${selectedCount} selected`

  const columnToggles = React.useMemo<ColumnToggle[]>(
    () =>
      table
        .getAllLeafColumns()
        .filter((c) => c.id !== SELECT_COLUMN_ID)
        .map((c) => ({
          id: c.id,
          label: headerLabel(c.columnDef.header, c.id),
          visible: c.getIsVisible(),
          canHide: c.getCanHide(),
        })),
    // `table` is a stable instance in v9 (state lives in atoms), so it alone would
    // never re-trigger this. The visibility slice is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table, table.state.columnVisibility],
  )

  const cellPad = density === 'compact' ? 'px-4 py-2' : 'px-4 py-3'

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {toolbarActions}
      <ViewOptionsPopover
        density={density}
        onDensityChange={setDensity}
        pageSize={pagination.pageSize}
        onPageSizeChange={(n) => {
          // Manual mode routes through onPaginationChange, which resets to page 1
          // and notifies the caller; client mode just re-slices locally.
          table.setPageSize(n)
          if (!manual) table.setPageIndex(0)
        }}
        columns={columnToggles}
        onColumnToggle={(id, visible) =>
          table
            .getAllLeafColumns()
            .find((c) => c.id === id)
            ?.toggleVisibility(visible)
        }
      />
    </div>
  )

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(toolbar || toolbarActions) && (
        // Stacked below md: giving the toolbar `flex-1 min-w-0` on a phone lets it
        // collapse to a sliver beside the controls, which is how a bulk bar ends up
        // one word wide.
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:flex-wrap md:items-start md:justify-between">
          <div className="min-w-0 md:flex-1">{toolbar}</div>
          {controls}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SkeletonTable
            rows={Math.min(pagination.pageSize, 8)}
            columns={columnToggles.length || 6}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">{empty}</div>
      ) : (
        <>
          {/* ---- table, md and up ---------------------------------------- */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
            {/* The only horizontal scroll in the app is the DATA, never the toolbar. */}
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-20">
                  {table.getHeaderGroups().map((group) => (
                    <tr key={group.id}>
                      {group.headers.map((header, index) => {
                        const isSelect = header.column.id === SELECT_COLUMN_ID
                        const frozen = index === 0
                        const sorted = header.column.getIsSorted()
                        const canSort = header.column.getCanSort()

                        return (
                          <th
                            key={header.id}
                            scope="col"
                            style={{ width: isSelect ? 44 : undefined }}
                            className={cn(
                              'border-b border-border bg-surface-raised text-left text-label font-semibold whitespace-nowrap text-muted',
                              cellPad,
                              frozen && 'sticky left-0 z-30',
                            )}
                          >
                            {isSelect ? (
                              <Checkbox
                                aria-label="Select all rows on this page"
                                checked={
                                  table.getIsAllPageRowsSelected()
                                    ? true
                                    : table.getIsSomePageRowsSelected()
                                      ? 'indeterminate'
                                      : false
                                }
                                onCheckedChange={(value) =>
                                  table.toggleAllPageRowsSelected(value === true)
                                }
                              />
                            ) : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="flex items-center gap-1.5 transition-colors duration-150 hover:text-text"
                                aria-label={`Sort by ${headerLabel(header.column.columnDef.header, header.column.id)}`}
                              >
                                {upperSnake(
                                  headerLabel(header.column.columnDef.header, header.column.id),
                                )}
                                <SortIcon sorted={sorted} />
                              </button>
                            ) : (
                              upperSnake(
                                headerLabel(header.column.columnDef.header, header.column.id),
                              )
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const selected = row.getIsSelected()
                    return (
                      <tr
                        key={row.id}
                        data-state={selected ? 'selected' : undefined}
                        tabIndex={0}
                        aria-selected={enableSelection ? selected : undefined}
                        onClick={() => onRowClick?.(row.original)}
                        onKeyDown={(e) => handleRowKeys(e, row, enableSelection, onRowClick)}
                        className={cn(
                          'border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface-hover',
                          selected && 'bg-primary/8',
                          onRowClick && 'cursor-pointer',
                        )}
                      >
                        {row.getVisibleCells().map((cell, index) => {
                          const isSelect = cell.column.id === SELECT_COLUMN_ID
                          const frozen = index === 0
                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                'align-middle text-body',
                                cellPad,
                                frozen && 'sticky left-0 z-10 bg-surface',
                                selected && frozen && 'bg-surface',
                              )}
                              // A click on the checkbox must not also open the row.
                              onClick={isSelect ? (e) => e.stopPropagation() : undefined}
                            >
                              {isSelect ? (
                                <Checkbox
                                  aria-label="Select row"
                                  checked={selected}
                                  onCheckedChange={(value) => row.toggleSelected(value === true)}
                                />
                              ) : (
                                <table.FlexRender cell={cell} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- stacked cards, below md --------------------------------- */}
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'rounded-lg border border-border bg-surface p-4',
                  row.getIsSelected() && 'border-primary/30 bg-primary/8',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {renderCard ? (
                  renderCard(row.original)
                ) : (
                  <dl className="space-y-1.5">
                    {row
                      .getVisibleCells()
                      .filter((c) => c.column.id !== SELECT_COLUMN_ID)
                      .map((cell) => (
                        <div key={cell.id} className="flex items-start justify-between gap-3">
                          <dt className="shrink-0 text-label text-muted">
                            {upperSnake(headerLabel(cell.column.columnDef.header, cell.column.id))}
                          </dt>
                          <dd className="min-w-0 text-right text-body">
                            <table.FlexRender cell={cell} />
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            ))}
          </div>

          {/* ---- footer -------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-caption text-muted tabular-nums">
              Total {total} {total === 1 ? noun : `${noun}s`}
              {enableSelection && selectedCount > 0 && ` · ${selectionSummary}`}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-caption text-faint tabular-nums">
                {pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
              </span>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="size-3 text-primary" aria-hidden="true" />
  if (sorted === 'desc') return <ArrowDown className="size-3 text-primary" aria-hidden="true" />
  return <ChevronsUpDown className="size-3 opacity-40" aria-hidden="true" />
}

/**
 * Column headers are authored as plain strings so the grammar can be applied once,
 * here. A header that is a render function falls back to the column id.
 */
function headerLabel(header: unknown, fallbackId: string): string {
  return typeof header === 'string' && header.length > 0 ? header : snake(fallbackId)
}

/**
 * Keyboard path (§11): arrows move between rows, space toggles selection, enter
 * opens the row. Rows are focusable, so tab reaches the table body directly.
 */
function handleRowKeys<TData extends RowData>(
  e: React.KeyboardEvent<HTMLTableRowElement>,
  row: { toggleSelected: (v: boolean) => void; getIsSelected: () => boolean; original: TData },
  enableSelection: boolean,
  onRowClick?: (row: TData) => void,
) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const sibling =
      e.key === 'ArrowDown'
        ? e.currentTarget.nextElementSibling
        : e.currentTarget.previousElementSibling
    if (sibling instanceof HTMLElement) sibling.focus()
    return
  }
  if (e.key === ' ' && enableSelection) {
    e.preventDefault()
    row.toggleSelected(!row.getIsSelected())
    return
  }
  if (e.key === 'Enter' && onRowClick) {
    e.preventDefault()
    onRowClick(row.original)
  }
}
