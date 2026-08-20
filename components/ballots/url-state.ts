'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'
import { useUiPreferences } from '@/lib/format/LocaleProvider'

import type { AccountFilters, RunFilters } from '@/lib/api/endpoints'
import { BALLOT_CLUB_IDS, type AccountStatus, type BallotClubId, type RunStatus } from '@/lib/types'

/**
 * Tab, filters, sort and page for /ballots — all of it in the query string, the same
 * way /accounts and /mytickets do it, through the one writer in lib/url-state.ts.
 *
 * The reason is the same as everywhere else and sharper here: during an on-sale one
 * operator sends another "the Leeds accounts that still need OTP" or "the run that is
 * failing", and a link has to open on exactly that. It also means a refresh lands
 * where the operator left off — which matters more on this screen than any other,
 * because the thing they are watching keeps moving while they are away.
 *
 * The three tabs share one param namespace deliberately. `q`, `sort`, `order`,
 * `page` and `size` mean the pool's table on `// pool` and the run history on
 * `// runs`; a tab switch resets them, so a sort that only exists on one table can
 * never be carried onto the other and silently dropped by the API.
 */

export type BallotsTabId = 'pool' | 'profiles' | 'runs'

/**
 * Numbered, because the product has a LOOP and the tabs were three neutral nouns.
 * Load accounts, choose a profile, run them, watch — §B1's own sequence, in the
 * `01_upload / 02_map_columns` grammar the CSV wizard already uses (§3.3b). A first
 * visitor should be able to read the order off the tab bar.
 */
export const BALLOT_TABS: Array<{ id: BallotsTabId; label: string }> = [
  { id: 'pool', label: '01 Pool' },
  { id: 'profiles', label: '02 Profiles' },
  { id: 'runs', label: '03 Runs' },
]

const DEFAULTS = {
  tab: 'pool' as BallotsTabId,
  order: 'desc' as 'asc' | 'desc',
  page: 1,
}

export const SEARCH_DEBOUNCE_MS = 250

/** The pool table's sortable columns, mapped onto the `/accounts` sort fields. */
const POOL_SORT: Record<string, string> = {
  account: 'email',
  club: 'club',
  status: 'status',
  lastRun: 'lastCheckedAt',
}

/** The run table's sortable columns, mapped onto the `/ballots/runs` sort fields. */
const RUN_SORT: Record<string, string> = {
  label: 'label',
  profile: 'profileName',
  status: 'status',
  started: 'startedAt',
}

export function sortFieldForColumn(tab: BallotsTabId, columnId: string): string | null {
  const table = tab === 'runs' ? RUN_SORT : POOL_SORT
  return table[columnId] ?? null
}

function columnForSortField(tab: BallotsTabId, field: string | null): string | null {
  if (!field) return null
  const table = tab === 'runs' ? RUN_SORT : POOL_SORT
  return Object.keys(table).find((id) => table[id] === field) ?? null
}

/** An unrecognised `?sort=` is dropped rather than forwarded to the API. */
function normaliseSort(tab: BallotsTabId, raw: string | null): string | null {
  if (!raw) return null
  const table = tab === 'runs' ? RUN_SORT : POOL_SORT
  return Object.values(table).includes(raw) ? raw : null
}

export interface BallotsUrlPatch {
  tab?: BallotsTabId
  /**
   * `?start=1` — open the launcher on arrival. An ARRIVAL, not a state: the screen
   * consumes it immediately, or the back button would reopen the dialog every time.
   */
  start?: '1' | null
  club?: BallotClubId | null
  status?: AccountStatus | null
  runStatus?: RunStatus | null
  q?: string | null
  sort?: string | null
  order?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useBallotsUrlState() {
  const params = useSearchParams()
  const url = useUrlWriter()

  const rawTab = params.get('tab') as BallotsTabId | null
  const tab = rawTab && BALLOT_TABS.some((t) => t.id === rawTab) ? rawTab : DEFAULTS.tab

  const rawClub = params.get('club') as BallotClubId | null
  // A club outside the seven is not a ballot club, so it is ignored rather than
  // passed to the API, which would return an empty table with no explanation.
  const club = rawClub && BALLOT_CLUB_IDS.includes(rawClub) ? rawClub : null

  const startRequested = params.get('start') === '1'

  const status = (params.get('status') as AccountStatus | null) ?? null
  const runStatus = (params.get('runStatus') as RunStatus | null) ?? null
  const q = params.get('q') ?? ''

  const sortField = normaliseSort(tab, params.get('sort'))
  const order = sortField && params.get('order') === 'asc' ? 'asc' : DEFAULTS.order
  const page = Math.max(1, Number(params.get('page') ?? DEFAULTS.page) || DEFAULTS.page)
  const { pageSize: defaultSize } = useUiPreferences()
  const size = Math.max(1, Number(params.get('size') ?? defaultSize) || defaultSize)

  const write = React.useCallback(
    (patch: BallotsUrlPatch) => {
      url.commit((next) => {
        // A tab switch resets the table state, because the two tables have different
        // columns: carrying `sort=startedAt` onto the pool would ask /accounts to
        // order by a field it does not have.
        if (patch.tab !== undefined && patch.tab !== next.get('tab')) {
          for (const key of ['club', 'status', 'runStatus', 'q', 'sort', 'order', 'page']) {
            next.delete(key)
          }
        }

        for (const [key, value] of Object.entries(patch)) {
          const fallback: unknown =
            key === 'size' ? defaultSize : DEFAULTS[key as keyof typeof DEFAULTS]
          if (value === undefined || value === null || value === '' || value === fallback) {
            next.delete(key)
          } else {
            next.set(key, String(value))
          }
        }

        // Any change other than paging returns to page 1 — page 9 of a filter that no
        // longer matches nine pages is an empty screen with no explanation.
        if (patch.page === undefined) next.delete('page')
      })
    },
    [url, defaultSize],
  )

  const writeRef = React.useRef(write)
  React.useEffect(() => {
    writeRef.current = write
  }, [write])

  // Local input, so every keystroke paints; the URL catches up when typing stops.
  const [searchInput, setSearchInputState] = React.useState(q)
  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSearchInput = React.useCallback((value: string) => {
    setSearchInputState(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => writeRef.current({ q: value }), SEARCH_DEBOUNCE_MS)
  }, [])

  React.useEffect(() => () => void (debounce.current && clearTimeout(debounce.current)), [])

  // The box has to follow a tab switch, which clears `q` behind its back.
  React.useEffect(() => {
    if (!q) setSearchInputState('')
  }, [q])

  const clearFilters = React.useCallback(() => {
    setSearchInputState('')
    if (debounce.current) clearTimeout(debounce.current)
    writeRef.current({ club: null, status: null, runStatus: null, q: null })
  }, [])

  const sortSpec = React.useMemo(() => {
    const id = columnForSortField(tab, sortField)
    return id ? { id, desc: order === 'desc' } : null
  }, [tab, sortField, order])

  /**
   * The pool's API filters. `club` is always one of the seven — the whole set when
   * no club is chosen — so an account outside the ballot clubs can never appear here
   * and be started by mistake.
   */
  const poolFilters = React.useMemo<AccountFilters>(
    () => ({
      page,
      pageSize: size,
      sort: sortField ?? undefined,
      order: sortField ? order : undefined,
      q: q || undefined,
      club: club ? [club] : BALLOT_CLUB_IDS,
      status: status ? [status] : undefined,
    }),
    [page, size, sortField, order, q, club, status],
  )

  const poolFiltersUnpaged = React.useMemo<AccountFilters>(() => {
    const rest: AccountFilters = { ...poolFilters }
    delete rest.page
    delete rest.pageSize
    return rest
  }, [poolFilters])

  const runFilters = React.useMemo<RunFilters>(
    () => ({
      page,
      pageSize: size,
      sort: sortField ?? undefined,
      order: sortField ? order : undefined,
      q: q || undefined,
      status: runStatus ? [runStatus] : undefined,
    }),
    [page, size, sortField, order, q, runStatus],
  )

  const filtered = Boolean(club || status || runStatus || q)

  return {
    tab,
    startRequested,
    club,
    status,
    runStatus,
    q,
    sortField,
    sortSpec,
    order,
    page,
    size,
    filtered,
    poolFilters,
    poolFiltersUnpaged,
    runFilters,
    searchInput,
    setSearchInput,
    clearFilters,
    set: write,
  }
}

export type BallotsUrlState = ReturnType<typeof useBallotsUrlState>
