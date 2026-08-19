'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'

import type { AccountFilters } from '@/lib/api/endpoints'
import type { AccountStatus, ClubId, MembershipType } from '@/lib/types'
import { normaliseSortField, sortSpecFor } from './sorting'

/**
 * Every filter, sort, page and tab value on /accounts lives in the query string.
 *
 * That is a product requirement, not a nicety: an operator working an on-sale sends
 * a colleague "the Arsenal accounts that need OTP" as a link, and it has to open on
 * exactly that view. It also means a refresh, a back button and a bookmark all land
 * where the operator left off, and there is no second copy of the filter state in
 * React that can drift from the URL.
 *
 * Writes use `router.replace`, so typing in the search box does not push twenty
 * history entries between the operator and the page they came from.
 */

export type AccountsTabId = 'accounts' | 'proxies' | 'imap' | 'otp'

export const ACCOUNT_TABS: Array<{ id: AccountsTabId; label: string }> = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'proxies', label: 'Proxies' },
  { id: 'imap', label: 'Email / IMAP' },
  { id: 'otp', label: 'OTP Inbox' },
]

/** Values equal to these are dropped from the URL, so a clean view has a clean link. */
const DEFAULTS = {
  tab: 'accounts' as AccountsTabId,
  order: 'asc' as 'asc' | 'desc',
  page: 1,
  size: 25,
}

export const SEARCH_DEBOUNCE_MS = 250

export interface AccountsUrlPatch {
  tab?: AccountsTabId
  club?: ClubId | null
  status?: AccountStatus | null
  type?: MembershipType | null
  tag?: string | null
  q?: string | null
  sort?: string | null
  order?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useAccountsUrlState() {
  const params = useSearchParams()
  const url = useUrlWriter()

  const tab = (params.get('tab') as AccountsTabId | null) ?? DEFAULTS.tab
  const club = (params.get('club') as ClubId | null) ?? null
  const status = (params.get('status') as AccountStatus | null) ?? null
  const type = (params.get('type') as MembershipType | null) ?? null
  const tag = params.get('tag')
  const q = params.get('q') ?? ''
  // An unrecognised `?sort=` is dropped rather than forwarded, so a hand-edited
  // link degrades to the endpoint's default order instead of a silent no-op.
  const sortField = normaliseSortField(params.get('sort'))
  // Direction only means something with a field to apply it to.
  const order = sortField && params.get('order') === 'desc' ? 'desc' : DEFAULTS.order
  const page = Math.max(1, Number(params.get('page') ?? DEFAULTS.page) || DEFAULTS.page)
  const size = Math.max(1, Number(params.get('size') ?? DEFAULTS.size) || DEFAULTS.size)

  /**
   * `useUrlWriter` carries the URL forward between writes in the same tick — see
   * lib/url-state.ts for why a header click needs that. Only the param schema below
   * is this screen's own.
   */
  const write = React.useCallback(
    (patch: AccountsUrlPatch) => {
      url.commit((next) => {
        for (const [key, value] of Object.entries(patch)) {
          const isDefault = value === DEFAULTS[key as keyof typeof DEFAULTS]
          if (value === undefined || value === null || value === '' || isDefault) next.delete(key)
          else next.set(key, String(value))
        }

        // Any change other than paging returns to page 1 — page 9 of a filter that no
        // longer matches nine pages is an empty screen with no explanation.
        if (patch.page === undefined) next.delete('page')
      })
    },
    [url],
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

  // The input is local so every keystroke paints immediately; the URL catches up
  // 250ms after the operator stops typing.
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
    writeRef.current({ club: null, status: null, type: null, tag: null, q: null })
  }, [])

  const filtered = Boolean(club || status || type || tag || q)

  /** The API filter object. Memoised, because it is half of every query key. */
  const filters = React.useMemo<AccountFilters>(
    () => ({
      page,
      pageSize: size,
      // Omitted rather than sent as the default: the request then says exactly what
      // the URL says, and the server applies its own `defaultSort`.
      sort: sortField ?? undefined,
      order: sortField ? order : undefined,
      q: q || undefined,
      club: club ? [club] : undefined,
      status: status ? [status] : undefined,
      membershipType: type ? [type] : undefined,
      tag: tag ? [tag] : undefined,
    }),
    [page, size, sortField, order, q, club, status, type, tag],
  )

  /**
   * The same sort in DataTable's terms, for the controlled `sorting` prop. Memoised:
   * it is table state, and a fresh object on every render would put the table into a
   * render loop.
   */
  const sortSpec = React.useMemo(() => sortSpecFor(sortField, order), [sortField, order])

  /** The same filters with paging stripped — what "everything matching" means. */
  const unpagedFilters = React.useMemo<AccountFilters>(() => {
    const rest: AccountFilters = { ...filters }
    delete rest.page
    delete rest.pageSize
    return rest
  }, [filters])

  return {
    tab,
    club,
    status,
    type,
    tag,
    q,
    sortField,
    sortSpec,
    order,
    page,
    size,
    filtered,
    filters,
    unpagedFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    set: write,
  }
}

export type AccountsUrlState = ReturnType<typeof useAccountsUrlState>
