'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * One writer for URL-backed screen state.
 *
 * THE BUG THIS EXISTS FOR
 *
 * `router.replace` does not update `useSearchParams` synchronously. So two writes in
 * the same tick both start from the same render-time snapshot, and the second
 * silently undoes the first.
 *
 * DataTable does exactly that on every header click: it emits `onSortingChange`, and
 * then `onPageChange(1)` because a new order makes page 9 meaningless. Built naively,
 * the page reset wins and the sort is written and then dropped — the request goes out
 * with `page=1` and no `sort`, and the column header appears not to work.
 *
 * The fix is to merge into the last value WRITTEN rather than the last value
 * RENDERED. `/accounts`, `/mytickets` and `/mylistings` each discovered this
 * separately and each solved it separately; this is that fix, once.
 *
 * Each screen keeps its own param schema — which keys exist, what their defaults are,
 * how they map onto an API filter object. Only the carry-forward lives here.
 */
export interface UrlWriter {
  /**
   * The query string as of the last write. Use this rather than `useSearchParams()`
   * when deriving a value that a pending write may already have changed.
   */
  currentSearch: () => string

  /** The same, parsed. A fresh object each call, safe to mutate. */
  read: () => URLSearchParams

  /**
   * Mutates the carried-forward params and replaces the URL.
   * Two `commit` calls in one tick compose instead of racing.
   */
  commit: (mutate: (params: URLSearchParams) => void) => void

  /** Replaces the whole query string, for callers that serialise their own state. */
  replaceWith: (params: URLSearchParams | string) => void
}

export function useUrlWriter(): UrlWriter {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const searchRef = React.useRef(params.toString())

  // Re-syncs only when the URL itself changes, so an unrelated re-render cannot
  // clobber a value that has been written but not yet read back.
  React.useEffect(() => {
    searchRef.current = params.toString()
  }, [params])

  const replaceWith = React.useCallback(
    (next: URLSearchParams | string) => {
      const search = typeof next === 'string' ? next : next.toString()
      searchRef.current = search
      // replace, not push: a filter tweak is not a navigation step, and `scroll: false`
      // keeps the table where the eye left it.
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const commit = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchRef.current)
      mutate(next)
      replaceWith(next)
    },
    [replaceWith],
  )

  return {
    currentSearch: () => searchRef.current,
    read: () => new URLSearchParams(searchRef.current),
    commit,
    replaceWith,
  }
}

/**
 * A writer whose identity is stable across renders.
 *
 * `useUrlWriter`'s `commit` changes identity whenever the pathname changes, which
 * would restart a pending debounce. Screens that debounce a search box hold this
 * instead, so the timer always fires the latest writer without depending on it.
 */
export function useStableUrlWriter(writer: UrlWriter): React.RefObject<UrlWriter> {
  const ref = React.useRef(writer)
  React.useEffect(() => {
    ref.current = writer
  }, [writer])
  return ref
}
