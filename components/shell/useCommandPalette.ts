'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApiError, type ApiResult } from '@/lib/api/client'
import { searchApi } from '@/lib/api/endpoints'
import { qk } from '@/lib/api/hooks/keys'
import type { SearchResult } from '@/lib/types'

/**
 * The palette's data and its memory.
 *
 * SEARCHING. `GET /search?q=` answers all four types in one request, so the palette
 * makes one call rather than four and does no filtering of its own — the server
 * decides what matches, and adding a type there adds it here for free.
 *
 * The query is debounced by 200ms and only runs from two characters. One character
 * matches most of the seed and tells the operator nothing, and firing on every
 * keystroke of `arsenal` is seven requests for one answer. Results from the previous
 * term stay on screen while the next one loads, so the list does not blink empty
 * between keystrokes.
 *
 * RECENT. Opening the palette with nothing typed should not be a blank box. The last
 * few things opened FROM the palette are kept in localStorage, most recent first, and
 * shown instead. They are stored as whole results rather than as ids because
 * re-fetching five records to draw a list nobody has asked to act on is work done on
 * the chance it is wanted.
 */

export const SEARCH_DEBOUNCE_MS = 200
export const MIN_QUERY_LENGTH = 2
const RECENT_KEY = 'fetch_recent_searches'
const RECENT_LIMIT = 5

function readRecent(): SearchResult[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Shape-checked rather than trusted: this is user-writable storage, and a bad
    // entry would crash the list it is drawn into.
    return parsed.filter(
      (item): item is SearchResult =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as SearchResult).id === 'string' &&
        typeof (item as SearchResult).title === 'string' &&
        typeof (item as SearchResult).href === 'string',
    )
  } catch {
    return []
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = React.useState<SearchResult[]>([])

  // After mount, so the server and the first client render agree.
  React.useEffect(() => {
    setRecent(readRecent())
  }, [])

  const remember = React.useCallback((result: SearchResult) => {
    setRecent((previous) => {
      const next = [result, ...previous.filter((item) => item.id !== result.id)].slice(
        0,
        RECENT_LIMIT,
      )
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // In-memory for this session is fine; this is a convenience, not state.
      }
      return next
    })
  }, [])

  const clear = React.useCallback(() => {
    setRecent([])
    try {
      window.localStorage.removeItem(RECENT_KEY)
    } catch {
      // Same.
    }
  }, [])

  return { recent, remember, clear }
}

export interface PaletteSearch {
  results: SearchResult[]
  /** True only while a NEW term is in flight with nothing to show yet. */
  loading: boolean
  error: string | null
  /** The term the results on screen belong to. Lags `query` by the debounce. */
  settled: string
}

export function usePaletteSearch(query: string, enabled: boolean): PaletteSearch {
  const [debounced, setDebounced] = React.useState('')

  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setDebounced('')
      return
    }
    const id = window.setTimeout(() => setDebounced(trimmed), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  const active = enabled && debounced.length >= MIN_QUERY_LENGTH

  const search = useQuery<ApiResult<SearchResult[]>, ApiError>({
    queryKey: qk.search.query(debounced),
    queryFn: () => searchApi.query(debounced),
    enabled: active,
    // The seed does not change between keystrokes, so a term typed, deleted and
    // retyped is answered from cache.
    staleTime: 30_000,
    // Keeps the last term's rows on screen while the next one resolves.
    placeholderData: (previous) => previous,
  })

  return {
    results: active ? (search.data?.data ?? []) : [],
    loading: active && search.isPending,
    error: search.error ? search.error.message : null,
    settled: active ? debounced : '',
  }
}
