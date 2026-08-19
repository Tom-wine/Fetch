'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'
import { useUiPreferences } from '@/lib/format/LocaleProvider'
import type { TaskFilters } from '@/lib/api/endpoints'
import type { SortSpec } from '@/components/data/DataTable'
import type { BallotClubId, EventLevel, TaskStatus } from '@/lib/types'

/**
 * What the operator is LOOKING AT on the monitor, in the query string.
 *
 * The point is not tidiness. Twenty minutes into an on-sale someone says "the Leeds
 * accounts that are failing" and pastes a link, and it has to open on exactly that —
 * `?status=FAILED&club=leeds`. It also means a reload lands back on the same filtered
 * view of a run that has moved on in the meantime.
 *
 * The SELECTED TASK is deliberately not here, the same call the fixture screen made:
 * it changes on every click, and a history entry per click buries the page the
 * operator came from.
 */

export const SEARCH_DEBOUNCE_MS = 250

export type PanelTab = 'task' | 'log' | 'summary'

const PANEL_TABS: Record<PanelTab, true> = { task: true, log: true, summary: true }

/** The task table's sortable columns, mapped onto the API's fields. */
const SORT: Record<string, string> = {
  account: 'accountEmail',
  club: 'clubId',
  status: 'status',
  attempt: 'attempt',
  duration: 'durationMs',
  updated: 'updatedAt',
}

export function sortFieldForColumn(columnId: string): string | null {
  return SORT[columnId] ?? null
}

function columnForSortField(field: string | null): string | null {
  if (!field) return null
  return Object.keys(SORT).find((id) => SORT[id] === field) ?? null
}

const DEFAULTS = {
  panel: 'log' as PanelTab,
  order: 'desc' as 'asc' | 'desc',
  page: 1,
  level: 'all' as EventLevel | 'all',
}

export interface MonitorPatch {
  status?: TaskStatus | null
  club?: BallotClubId | null
  q?: string | null
  sort?: string | null
  order?: 'asc' | 'desc'
  page?: number
  size?: number
  panel?: PanelTab
  level?: EventLevel | 'all'
}

export function useMonitorUrlState() {
  const params = useSearchParams()
  const url = useUrlWriter()

  const rawPanel = params.get('panel') as PanelTab | null
  // `// run_log` is the default tab because it is the answer to "is it working",
  // which is the question this screen is opened to answer.
  const panel = rawPanel && PANEL_TABS[rawPanel] ? rawPanel : DEFAULTS.panel

  const status = (params.get('status') as TaskStatus | null) ?? null
  const club = (params.get('club') as BallotClubId | null) ?? null
  const q = params.get('q') ?? ''
  const level = (params.get('level') as EventLevel | 'all' | null) ?? DEFAULTS.level

  // An unrecognised `?sort=` is dropped rather than forwarded, so a hand-edited link
  // degrades to the endpoint's own order instead of a silent no-op.
  const rawSort = params.get('sort')
  const sortField = rawSort && Object.values(SORT).includes(rawSort) ? rawSort : null
  const order = sortField && params.get('order') === 'asc' ? 'asc' : DEFAULTS.order

  const page = Math.max(1, Number(params.get('page') ?? DEFAULTS.page) || DEFAULTS.page)
  const { pageSize: defaultSize } = useUiPreferences()
  const size = Math.max(1, Number(params.get('size') ?? defaultSize) || defaultSize)

  const write = React.useCallback(
    (patch: MonitorPatch) => {
      url.commit((next) => {
        for (const [key, value] of Object.entries(patch)) {
          const fallback: unknown =
            key === 'size' ? defaultSize : DEFAULTS[key as keyof typeof DEFAULTS]
          if (value === undefined || value === null || value === '' || value === fallback) {
            next.delete(key)
          } else {
            next.set(key, String(value))
          }
        }

        // Anything but paging returns to page 1. Page 4 of a filter that now matches
        // one page is an empty table with no explanation — and on a screen where the
        // underlying set is changing every three seconds, that happens on its own.
        if (patch.page === undefined) next.delete('page')
      })
    },
    [url, defaultSize],
  )

  const writeRef = React.useRef(write)
  React.useEffect(() => {
    writeRef.current = write
  }, [write])

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
    writeRef.current({ status: null, club: null, q: null })
  }, [])

  const sortSpec = React.useMemo<SortSpec | null>(() => {
    const id = columnForSortField(sortField)
    return id ? { id, desc: order === 'desc' } : null
  }, [sortField, order])

  /**
   * The task query's filters. Memoised because this object is half of the query key,
   * and a fresh identity every render would restart the 3s poll on every tick of the
   * 1s one.
   */
  const filters = React.useMemo<TaskFilters>(
    () => ({
      page,
      pageSize: size,
      sort: sortField ?? undefined,
      order: sortField ? order : undefined,
      q: q || undefined,
      status: status ? [status] : undefined,
      clubId: club ? [club] : undefined,
    }),
    [page, size, sortField, order, q, status, club],
  )

  const filtered = Boolean(status || club || q)

  return {
    panel,
    status,
    club,
    q,
    level,
    sortField,
    sortSpec,
    order,
    page,
    size,
    filters,
    filtered,
    searchInput,
    setSearchInput,
    clearFilters,
    set: write,
  }
}

export type MonitorUrlState = ReturnType<typeof useMonitorUrlState>
