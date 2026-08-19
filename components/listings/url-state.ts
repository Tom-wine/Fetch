'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ALL } from '@/components/data/FilterSelect'
import { useLocale } from '@/lib/format/LocaleProvider'
import type { ListingFilters } from '@/lib/api/endpoints'
import type { ListingStatus, Platform } from '@/lib/types'
import { PLATFORMS } from '@/lib/registries/platforms'
import { LISTING_STATUSES } from '@/components/domain/StatusChip'
import { ORIGINAL, isDisplayCurrency, type DisplayCurrency } from './currency'
import { columnIdForField, normaliseSortField } from './sorting'
import type { SortSpec } from '@/components/data/DataTable'

/**
 * Every filter, sort, page and display choice on /mylistings lives in the query
 * string — there is no second copy in React that can drift from it.
 *
 * That is a product requirement: an operator spotting that the Ticombo listings for
 * a weekend fixture are all under the floor sends a colleague a link, and it has to
 * open on exactly those rows, in exactly the currency they were reading them in.
 *
 * Writes use `router.replace`, so typing in the search box does not push twenty
 * history entries between the operator and the page they came from.
 */

const PLATFORM_IDS = new Set<string>(PLATFORMS.map((p) => p.id))
const STATUS_IDS = new Set<string>(LISTING_STATUSES)

export const DEFAULT_PAGE_SIZE = 25
export const SEARCH_DEBOUNCE_MS = 250

export interface ListingsUrlPatch {
  q?: string | null
  /** The whole platform set — the ▾ and the chip row write the same key. */
  platforms?: Platform[]
  /** An account id, or ALL. */
  account?: string | null
  status?: ListingStatus | null
  show?: DisplayCurrency
  sort?: string
  order?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useListingsUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { settings } = useLocale()

  /**
   * The screen's normaliser starts from the app-wide display currency (§9 rule 6 —
   * Preferences is the single source), and the URL only records a departure from it.
   * A link therefore carries the currency it was read in, while an untouched screen
   * still honours the operator's own setting.
   */
  const defaultShow: DisplayCurrency = settings.displayCurrency ?? ORIGINAL

  const rawShow = params.get('show')
  const show: DisplayCurrency = isDisplayCurrency(rawShow) ? rawShow : defaultShow

  const q = params.get('q') ?? ''
  const platforms = params.getAll('platform').filter((p) => PLATFORM_IDS.has(p)) as Platform[]
  const account = params.get('account') ?? ALL
  const rawStatus = params.get('status')
  const status = rawStatus && STATUS_IDS.has(rawStatus) ? (rawStatus as ListingStatus) : null
  const sortField = normaliseSortField(params.get('sort'))
  const order: 'asc' | 'desc' = params.get('order') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const size = Math.max(1, Number(params.get('size') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)
  const fail = readFail(params.get('__fail'))

  /**
   * The URL as of the last WRITE, not as of the last render.
   *
   * One header click produces two calls in the same tick: DataTable emits
   * `onSortingChange`, then `onPageChange(1)`. Both would otherwise start from the
   * same render-time `params` snapshot — `router.replace` has not updated
   * `useSearchParams` by then — and the second would silently undo the first, so the
   * click would look like it did nothing. Carrying the URL forward makes writes
   * within a tick compose instead of race. (Same fix as
   * components/accounts/url-state.ts and components/fixtures/filters.ts.)
   */
  const searchRef = React.useRef(params.toString())
  React.useEffect(() => {
    searchRef.current = params.toString()
  }, [params])

  const write = React.useCallback(
    (patch: ListingsUrlPatch) => {
      const next = new URLSearchParams(searchRef.current)

      if ('q' in patch) set(next, 'q', patch.q)
      if ('account' in patch) set(next, 'account', patch.account === ALL ? null : patch.account)
      if ('status' in patch) set(next, 'status', patch.status)
      if ('show' in patch) set(next, 'show', patch.show === defaultShow ? null : patch.show)
      if ('sort' in patch) set(next, 'sort', patch.sort)
      if ('order' in patch) set(next, 'order', patch.order === 'asc' ? null : patch.order)
      if ('size' in patch) set(next, 'size', patch.size === DEFAULT_PAGE_SIZE ? null : patch.size)
      if ('page' in patch) set(next, 'page', (patch.page ?? 1) <= 1 ? null : patch.page)

      if ('platforms' in patch) {
        next.delete('platform')
        for (const platform of patch.platforms ?? []) next.append('platform', platform)
      }

      // Anything that changes WHICH rows are on screen returns to page 1 — page 3 of
      // a filter that no longer matches three pages is an empty screen with no
      // explanation. `show` is display-only, so it leaves the page alone.
      const displayOnly = Object.keys(patch).every((key) => key === 'page' || key === 'show')
      if (!displayOnly) next.delete('page')

      const search = next.toString()
      searchRef.current = search
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
    },
    [defaultShow, pathname, router],
  )

  /**
   * `write` changes identity whenever the URL does, which would restart a pending
   * debounce every render. The ref keeps the debounce pointed at the latest writer
   * without making it a dependency.
   */
  const writeRef = React.useRef(write)
  React.useEffect(() => {
    writeRef.current = write
  }, [write])

  // Local so every keystroke paints immediately; the URL catches up once the
  // operator stops typing.
  const [searchInput, setSearchInputState] = React.useState(q)
  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSearchInput = React.useCallback((value: string) => {
    setSearchInputState(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => writeRef.current({ q: value }), SEARCH_DEBOUNCE_MS)
  }, [])

  React.useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), [])

  const clearFilters = React.useCallback(() => {
    setSearchInputState('')
    if (debounce.current) clearTimeout(debounce.current)
    writeRef.current({ q: null, platforms: [], account: ALL, status: null })
  }, [])

  const platformKey = platforms.join(',')
  const filtered = Boolean(q || platforms.length || account !== ALL || status)

  /** The API filter object. Memoised, because it is half of every query key. */
  const filters = React.useMemo<ListingFilters>(
    () => ({
      page,
      pageSize: size,
      sort: sortField,
      order,
      q: q || undefined,
      platform: platformKey ? (platformKey.split(',') as Platform[]) : undefined,
      accountId: account === ALL ? undefined : [account],
      status: status ? [status] : undefined,
    }),
    // `fail` is deliberately absent: see the note on `readFail` below.
    [page, size, sortField, order, q, platformKey, account, status],
  )

  /** The same filters with paging stripped — what "everything matching" means. */
  const unpagedFilters = React.useMemo<ListingFilters>(() => {
    const rest: ListingFilters = { ...filters }
    delete rest.page
    delete rest.pageSize
    return rest
  }, [filters])

  /**
   * The same sort in DataTable's terms. Memoised: it is table state, and a fresh
   * object every render would put the table into a loop.
   */
  const sortSpec = React.useMemo<SortSpec>(
    () => ({ id: columnIdForField(sortField), desc: order === 'desc' }),
    [sortField, order],
  )

  return {
    q,
    platforms,
    account,
    status,
    show,
    defaultShow,
    sortField,
    sortSpec,
    order,
    page,
    size,
    fail,
    filtered,
    filters,
    unpagedFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    set: write,
  }
}

export type ListingsUrlState = ReturnType<typeof useListingsUrlState>

function set(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value === undefined || value === null || value === '') params.delete(key)
  else params.set(key, String(value))
}

/**
 * §6.2 failure injection, forwarded from the screen's own URL to the API — but only
 * onto the WRITES, never onto the list query.
 *
 * On /mytickets `__fail` is attached to the read, because there the thing being
 * demonstrated is the error state. Here it is the optimistic ROLLBACK: the new price
 * has to appear in a real row, be refused, and visibly come back. Failing the list as
 * well would leave an error panel with no rows to edit, so the parameter would
 * destroy the very thing it exists to show.
 */
function readFail(raw: string | null): number | null {
  if (!raw) return null
  const status = Number(raw)
  return Number.isFinite(status) && status >= 400 && status <= 599 ? status : null
}
