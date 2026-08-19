'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'
import { useUiPreferences } from '@/lib/format/LocaleProvider'
import { ALL } from '@/components/data/FilterSelect'
import type { SortSpec } from '@/components/data/DataTable'
import type { TicketFilters } from '@/lib/api/endpoints'
import { columnIdForField, DEFAULT_SORT_FIELD, isSortField } from './sorting'

/**
 * Every filter, sort, page and panel choice on the fixture screen lives in the query
 * string. There is no second copy in React that can drift from it, so a link to
 * `?block=Clock%20End%205&tab=fixture` opens on exactly the seats and the tab the
 * sender was looking at.
 *
 * The SELECTION is deliberately not here. It is the one piece of state that is about
 * what the operator is doing right now rather than what they are looking at, and a
 * URL that changed on every click would fill the history with noise.
 *
 * Writes go through `lib/url-state`'s carried-forward writer, because DataTable emits
 * `onSortingChange` and `onPageChange(1)` in the same tick — see that file for why
 * merging into the last RENDERED params silently drops the sort.
 */

export const SEARCH_DEBOUNCE_MS = 250

export type PanelTab = 'ticket' | 'map'

const TABS: Record<PanelTab, true> = { ticket: true, map: true }

export interface FixtureDetailPatch {
  q?: string | null
  /** An account id, or ALL. */
  account?: string
  /** A block name, or ALL. */
  block?: string
  /** A seat row, or ALL. */
  row?: string
  /** Selecting one seat selects the rest of its group. */
  autoGroup?: boolean
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  size?: number
  tab?: PanelTab
}

export function useFixtureDetailUrlState(fixtureId: string) {
  const params = useSearchParams()
  const url = useUrlWriter()

  const q = params.get('q') ?? ''
  const account = params.get('account') ?? ALL
  const block = params.get('block') ?? ALL
  const row = params.get('row') ?? ALL
  const autoGroup = params.get('group') === 'auto'
  const rawSort = params.get('sort')
  const sortField = isSortField(rawSort) ? (rawSort as string) : DEFAULT_SORT_FIELD
  const order: 'asc' | 'desc' = params.get('order') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  // Rows per page falls back to the operator's preference, like every other table.
  const { pageSize: defaultSize } = useUiPreferences()
  const size = Math.max(1, Number(params.get('size') ?? defaultSize) || defaultSize)
  const rawTab = params.get('tab')
  const tab: PanelTab = rawTab && rawTab in TABS ? (rawTab as PanelTab) : 'ticket'
  const fail = readFail(params.get('__fail'))

  const write = React.useCallback(
    (patch: FixtureDetailPatch) => {
      url.commit((next) => {
        if ('q' in patch) set(next, 'q', patch.q)
        if ('account' in patch) set(next, 'account', patch.account === ALL ? null : patch.account)
        if ('block' in patch) set(next, 'block', patch.block === ALL ? null : patch.block)
        if ('row' in patch) set(next, 'row', patch.row === ALL ? null : patch.row)
        if ('autoGroup' in patch) set(next, 'group', patch.autoGroup ? 'auto' : null)
        if ('sort' in patch)
          set(next, 'sort', patch.sort === DEFAULT_SORT_FIELD ? null : patch.sort)
        if ('order' in patch) set(next, 'order', patch.order === 'asc' ? null : patch.order)
        if ('size' in patch) set(next, 'size', patch.size === defaultSize ? null : patch.size)
        if ('page' in patch) set(next, 'page', (patch.page ?? 1) <= 1 ? null : patch.page)
        if ('tab' in patch) set(next, 'tab', patch.tab === 'ticket' ? null : patch.tab)

        // Anything that changes WHICH seats are on screen returns to page 1. The panel
        // tab and the auto-group preference change neither, so they leave it alone.
        const viewOnly = Object.keys(patch).every(
          (key) => key === 'page' || key === 'tab' || key === 'autoGroup',
        )
        if (!viewOnly) next.delete('page')
      })
    },
    [url, defaultSize],
  )

  /**
   * `write` changes identity whenever the URL does, which would restart a pending
   * debounce on every render. The ref keeps the timer pointed at the latest writer
   * without making it a dependency.
   */
  const writeRef = React.useRef(write)
  React.useEffect(() => {
    writeRef.current = write
  }, [write])

  // Local, so every keystroke paints immediately and the URL catches up once the
  // operator stops typing. It re-syncs when the URL changes underneath it, which is
  // what "clear filters" and the back button do.
  const [searchInput, setSearchInputState] = React.useState(q)
  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setSearchInputState((current) => (current === q ? current : q))
  }, [q])

  const setSearchInput = React.useCallback((value: string) => {
    setSearchInputState(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => writeRef.current({ q: value }), SEARCH_DEBOUNCE_MS)
  }, [])

  React.useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), [])

  const clearFilters = React.useCallback(() => {
    setSearchInputState('')
    if (debounce.current) clearTimeout(debounce.current)
    writeRef.current({ q: null, account: ALL, block: ALL, row: ALL })
  }, [])

  const activeCount =
    (q ? 1 : 0) + (account !== ALL ? 1 : 0) + (block !== ALL ? 1 : 0) + (row !== ALL ? 1 : 0)

  /** The API filter object. Memoised, because it is half of every query key. */
  const filters = React.useMemo<TicketFilters>(
    () => ({
      page,
      pageSize: size,
      sort: sortField,
      order,
      q: q || undefined,
      accountId: account === ALL ? undefined : [account],
      block: block === ALL ? undefined : [block],
      row: row === ALL ? undefined : [row],
      // Forwarded to the READ, the way /mytickets does it: on this screen the thing
      // `?__fail=500` demonstrates is the error state and its Retry.
      ...(fail === null ? {} : { __fail: fail }),
    }),
    [page, size, sortField, order, q, account, block, row, fail],
  )

  /**
   * The same sort in DataTable's terms. Memoised: it is table state, and a fresh
   * object every render would put the table into a loop.
   */
  const sortSpec = React.useMemo<SortSpec>(
    () => ({ id: columnIdForField(sortField), desc: order === 'desc' }),
    [sortField, order],
  )

  return {
    fixtureId,
    q,
    account,
    block,
    row,
    autoGroup,
    sortField,
    sortSpec,
    order,
    page,
    size,
    tab,
    fail,
    activeCount,
    filters,
    searchInput,
    setSearchInput,
    clearFilters,
    set: write,
  }
}

export type FixtureDetailUrlState = ReturnType<typeof useFixtureDetailUrlState>

function set(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') params.delete(key)
  else params.set(key, String(value))
}

/** §6.2 failure injection, forwarded from the screen's own URL to the API. */
function readFail(raw: string | null): number | null {
  if (!raw) return null
  const status = Number(raw)
  return Number.isFinite(status) && status >= 400 && status <= 599 ? status : null
}
