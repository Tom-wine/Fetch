'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'
import { useUiPreferences } from '@/lib/format/LocaleProvider'

import { ALL } from '@/components/data/FilterSelect'
import { CLUBS, type ClubId } from '@/lib/registries/clubs'
import { PROVIDERS, type Competition, type ProviderId } from '@/lib/registries/providers'
import type { FixtureFilters } from '@/lib/api/endpoints'
import { DEFAULT_SORT_FIELD, isSortField } from './sorting'

/**
 * Every control on /mytickets writes to the query string and reads back from it —
 * there is no second copy of the filter state in React (§8.4: all state in the URL).
 *
 * That is what makes a filtered inventory shareable: a link to
 * `?when=upcoming&club=arsenal&account=acc_012` opens on the same rows for whoever
 * receives it, and the back button walks the filter history rather than leaving the
 * screen. It also means the Query key is derived from one source, so two controls can
 * never disagree about what is on screen.
 */

export type WhenFilter = 'all' | 'upcoming' | 'past'
export type FixtureView = 'table' | 'grid'

export interface FixtureQueryState {
  q: string
  when: WhenFilter
  /** A ClubId, or ALL. */
  club: string
  /** A Competition, or ALL. */
  competition: string
  /** An account id, or ALL. */
  accountId: string
  /** Provider ids — repeated keys, OR'd by the API (§6.2). */
  providers: ProviderId[]
  /** A region id (a city), or ALL. Expands to a club OR-list on the wire. */
  region: string
  /** A field path the API sorts by (§8.4 default: kickoff ascending). */
  sort: string
  order: 'asc' | 'desc'
  view: FixtureView
  page: number
  pageSize: number
  /**
   * §6.2 failure injection. `?__fail=500` on the screen's own URL is forwarded to the
   * API so the error state and its Retry can be demonstrated without unplugging
   * anything. A real backend ignores the parameter.
   */
  fail: number | null
}

export const DEFAULT_STATE: FixtureQueryState = {
  q: '',
  // The control is labelled "Upcoming only", so defaulting it to `all` would make the
  // label a lie on first load.
  when: 'upcoming',
  club: ALL,
  competition: ALL,
  accountId: ALL,
  providers: [],
  region: ALL,
  sort: DEFAULT_SORT_FIELD,
  order: 'asc',
  view: 'table',
  page: 1,
  pageSize: 25,
  fail: null,
}

/* ------------------------------------------------------------------ regions */

export interface Region {
  id: string
  /** Domain data — rendered verbatim, never snake_cased. */
  label: string
  clubs: ClubId[]
}

/**
 * A "region" is the city a club plays in. It is derived rather than declared, so a
 * new club in `lib/registries/clubs` appears in the filter without a second edit, and
 * it needs no new endpoint: the API already ORs a repeated `club` key, so
 * `region=london` goes out as seven `club=` params.
 */
export const REGIONS: Region[] = (() => {
  const byCity = new Map<string, Region>()
  for (const club of CLUBS) {
    const id = club.city.toLowerCase().replace(/\s+/g, '-')
    const found = byCity.get(id)
    if (found) found.clubs.push(club.id)
    else byCity.set(id, { id, label: club.city, clubs: [club.id] })
  }
  return [...byCity.values()].sort((a, b) => a.label.localeCompare(b.label, 'en'))
})()

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id)
}

/* ------------------------------------------------------------ url and state */

/** The competition union as a lookup, so the URL reader can validate against it. */
const COMPETITIONS: Record<Competition, true> = {
  'premier-league': true,
  'fa-cup': true,
  'efl-cup': true,
  ucl: true,
  uel: true,
  friendly: true,
}

export const COMPETITION_IDS = Object.keys(COMPETITIONS) as Competition[]

const PROVIDER_IDS = new Set<string>(PROVIDERS.map((p) => p.id))
const CLUB_IDS = new Set<string>(CLUBS.map((c) => c.id))

function one(params: URLSearchParams, key: string, allowed: (value: string) => boolean): string {
  const raw = params.get(key)
  return raw && allowed(raw) ? raw : ALL
}

/**
 * `defaultPageSize` is threaded in rather than read from `DEFAULT_STATE` because its
 * default is the operator's rows-per-page preference, which only a hook can see. Both
 * this and `writeState` take it so a size equal to the preference stays out of the URL.
 */
export function readState(
  params: URLSearchParams,
  defaultPageSize: number = DEFAULT_STATE.pageSize,
): FixtureQueryState {
  const when = params.get('when')
  const view = params.get('view')
  const page = Number(params.get('page') ?? 1)
  const size = Number(params.get('size') ?? defaultPageSize)

  return {
    q: params.get('q') ?? '',
    when: when === 'all' || when === 'past' || when === 'upcoming' ? when : DEFAULT_STATE.when,
    club: one(params, 'club', (v) => CLUB_IDS.has(v)),
    competition: one(params, 'competition', (v) => v in COMPETITIONS),
    accountId: params.get('account') ?? ALL,
    providers: params.getAll('provider').filter((p) => PROVIDER_IDS.has(p)) as ProviderId[],
    region: one(params, 'region', (v) => REGIONS.some((r) => r.id === v)),
    sort: isSortField(params.get('sort') ?? '')
      ? (params.get('sort') as string)
      : DEFAULT_STATE.sort,
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
    view: view === 'grid' ? 'grid' : 'table',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    pageSize: Number.isFinite(size) && size > 0 ? Math.floor(size) : defaultPageSize,
    fail: readFail(params.get('__fail')),
  }
}

/** Only non-default values are written, so a pristine screen keeps a clean URL. */
export function writeState(
  state: FixtureQueryState,
  defaultPageSize: number = DEFAULT_STATE.pageSize,
): URLSearchParams {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.when !== DEFAULT_STATE.when) params.set('when', state.when)
  if (state.club !== ALL) params.set('club', state.club)
  if (state.competition !== ALL) params.set('competition', state.competition)
  if (state.accountId !== ALL) params.set('account', state.accountId)
  for (const provider of state.providers) params.append('provider', provider)
  if (state.region !== ALL) params.set('region', state.region)
  if (state.sort !== DEFAULT_STATE.sort) params.set('sort', state.sort)
  if (state.order !== DEFAULT_STATE.order) params.set('order', state.order)
  if (state.view !== DEFAULT_STATE.view) params.set('view', state.view)
  if (state.page > 1) params.set('page', String(state.page))
  if (state.pageSize !== defaultPageSize) params.set('size', String(state.pageSize))
  if (state.fail !== null) params.set('__fail', String(state.fail))
  return params
}

function readFail(raw: string | null): number | null {
  if (!raw) return null
  const status = Number(raw)
  return Number.isFinite(status) && status >= 400 && status <= 599 ? status : null
}

/* --------------------------------------------------------------- the hook */

export interface FixtureFilterControls {
  state: FixtureQueryState
  /** Merges a patch into the URL. Any filter change resets to page 1. */
  set: (patch: Partial<FixtureQueryState>) => void
  /** Clears every filter, keeping the view mode and page size. */
  clear: () => void
  /** How many filters are narrowing the list — drives the `Filters (N)` count. */
  activeCount: number
}

export function useFixtureFilters(): FixtureFilterControls {
  const params = useSearchParams()
  const url = useUrlWriter()

  const { pageSize: defaultPageSize } = useUiPreferences()

  const state = React.useMemo(
    () => readState(new URLSearchParams(params.toString()), defaultPageSize),
    [params, defaultPageSize],
  )

  /**
   * `useUrlWriter` carries the URL forward between writes in the same tick — see
   * lib/url-state.ts for why a header click needs that. Reading the carried string
   * back through this screen's own `readState` means there is no second copy of the
   * state to keep in sync.
   */
  const push = React.useCallback(
    (next: FixtureQueryState) => {
      url.replaceWith(writeState(next, defaultPageSize))
    },
    [url, defaultPageSize],
  )

  const set = React.useCallback(
    (patch: Partial<FixtureQueryState>) => {
      const next = { ...readState(url.read(), defaultPageSize), ...patch }
      // Page 9 of 13 is meaningless once the filter — or the order — under it changes.
      const onlyPaging = Object.keys(patch).every((k) => k === 'page' || k === 'view')
      if (!onlyPaging) next.page = 1
      push(next)
    },
    [push, url, defaultPageSize],
  )

  const clear = React.useCallback(() => {
    push({
      ...DEFAULT_STATE,
      view: state.view,
      pageSize: state.pageSize,
      sort: state.sort,
      order: state.order,
      fail: state.fail,
    })
  }, [push, state.fail, state.order, state.pageSize, state.sort, state.view])

  return { state, set, clear, activeCount: countActive(state) }
}

export function countActive(state: FixtureQueryState): number {
  return (
    (state.q ? 1 : 0) +
    (state.when !== DEFAULT_STATE.when ? 1 : 0) +
    (state.club !== ALL ? 1 : 0) +
    (state.competition !== ALL ? 1 : 0) +
    (state.accountId !== ALL ? 1 : 0) +
    (state.region !== ALL ? 1 : 0) +
    state.providers.length
  )
}

/* ---------------------------------------------------------- state to wire */

/** A club id the API can never match, used when club and region do not intersect. */
const NO_CLUB = '__none__' as ClubId

/**
 * Maps the URL state onto the §6.3 `GET /fixtures` query. Sorting travels to the
 * server rather than happening in the table, because DataTable sorts only the page it
 * holds (ASK 1 in fetch-sync.md) — §8.4's default is kickoff ascending.
 */
export function toFixtureFilters(state: FixtureQueryState): FixtureFilters {
  const region = state.region === ALL ? undefined : getRegion(state.region)
  const club = state.club === ALL ? undefined : (state.club as ClubId)

  let clubs: ClubId[] | undefined
  if (club && region) clubs = region.clubs.includes(club) ? [club] : [NO_CLUB]
  else if (club) clubs = [club]
  else if (region) clubs = region.clubs

  return {
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    order: state.order,
    q: state.q || undefined,
    when: state.when,
    club: clubs,
    competition: state.competition === ALL ? undefined : [state.competition as Competition],
    accountId: state.accountId === ALL ? undefined : state.accountId,
    ...(state.fail === null ? {} : { __fail: state.fail }),
    // `provider` is not declared on FixtureFilters, but the route reads it and
    // ListParams carries the QueryParams index signature, so it travels as-is.
    ...(state.providers.length ? { provider: state.providers } : {}),
  }
}
