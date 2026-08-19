'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Compass, Key, List, Ticket, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Prose } from '@/components/ui/typography'
import type { SearchResult, SearchResultType } from '@/lib/types'
import { MIN_QUERY_LENGTH, usePaletteSearch, useRecentSearches } from './useCommandPalette'

/**
 * ⌘K / Ctrl+K (§7 #5).
 *
 * Accounts by email, name or membership id; fixtures by either team; listings by
 * marketplace id; and the screens themselves — all from one `GET /search?q=`, grouped
 * by what they are. An operator looking for `arsenal` does not know whether they want
 * the fixture or the twelve accounts, so the palette shows both and lets the grouping
 * answer the question.
 *
 * `shouldFilter={false}`: cmdk filters client-side by default, which would take the
 * server's matches and then hide the ones whose visible title does not contain the
 * term. That is wrong here — an account matched on its membership id has neither the
 * id nor the term in its title, so cmdk would throw away a correct result.
 *
 * The dialog owns the query rather than a parent, and clears it on close: reopening
 * onto the last search, with its results, reads as though the palette never closed.
 */

const GROUPS: Array<{ type: SearchResultType; label: string; icon: LucideIcon }> = [
  { type: 'account', label: 'Accounts', icon: Key },
  { type: 'fixture', label: 'Fixtures', icon: Ticket },
  { type: 'listing', label: 'Listings', icon: List },
  { type: 'navigation', label: 'Navigation', icon: Compass },
]

const ICON_OF: Record<SearchResultType, LucideIcon> = {
  account: Key,
  fixture: Ticket,
  listing: List,
  navigation: Compass,
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const { recent, remember, clear } = useRecentSearches()
  const { results, loading, error, settled } = usePaletteSearch(query, open)

  React.useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const open_ = React.useCallback(
    (result: SearchResult) => {
      remember(result)
      onOpenChange(false)
      router.push(result.href)
    },
    [onOpenChange, remember, router],
  )

  const typing = query.trim().length >= MIN_QUERY_LENGTH
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: results.filter((result) => result.type === group.type),
  })).filter((group) => group.items.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] w-[min(640px,calc(100vw-2rem))] max-w-none translate-y-0 gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Named for assistive tech; the input below is the visible label. */}
        <DialogTitle className="sr-only">Search Fetch.io</DialogTitle>
        <DialogDescription className="sr-only">
          Search accounts, fixtures, listings and screens. Use the arrow keys to move and Enter to
          open.
        </DialogDescription>

        <Command shouldFilter={false} loop className="bg-transparent">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search accounts, fixtures, listings…"
          />

          {/*
            Tall enough that four groups are readable at once. The palette's normal
            result is one hit in each of accounts, fixtures, listings and navigation,
            and a list that shows two of them makes the other two look absent rather
            than below the fold.
          */}
          <CommandList className="max-h-[min(70vh,560px)]">
            {error ? (
              // Not ErrorState: that is a region-sized component with a Retry button,
              // and the retry here is to keep typing.
              <div className="px-4 py-8 text-center">
                <Prose className="text-danger-ink">{error}</Prose>
              </div>
            ) : !typing ? (
              recent.length > 0 ? (
                <CommandGroup heading="Recent">
                  {recent.map((result) => (
                    <ResultRow key={result.id} result={result} onSelect={open_} />
                  ))}
                  <CommandItem
                    value="__clear_recent__"
                    onSelect={clear}
                    className="text-caption text-muted"
                  >
                    Clear recent
                  </CommandItem>
                </CommandGroup>
              ) : (
                <Hint>
                  Type at least {MIN_QUERY_LENGTH} characters. Accounts match on email, name or
                  membership id, fixtures on either team, listings on their marketplace id.
                </Hint>
              )
            ) : loading ? (
              <Hint>Searching…</Hint>
            ) : grouped.length === 0 ? (
              <CommandEmpty>
                <Prose className="text-muted">
                  Nothing matches <span className="font-mono text-text">{settled}</span>.
                </Prose>
              </CommandEmpty>
            ) : (
              grouped.map((group) => (
                <CommandGroup key={group.type} heading={group.label}>
                  {group.items.map((result) => (
                    <ResultRow key={result.id} result={result} onSelect={open_} />
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>

          <footer className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="font-mono text-caption text-faint">{'// search'}</span>
            <span className="flex items-center gap-3 font-mono text-caption text-faint">
              <Hotkey keys="↑↓" label="move" />
              <Hotkey keys="↵" label="open" />
              <Hotkey keys="esc" label="close" />
            </span>
          </footer>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One row. The `value` is the id rather than the title, because cmdk keys its
 * selection on it and two accounts can share a display name.
 */
function ResultRow({
  result,
  onSelect,
}: {
  result: SearchResult
  onSelect: (result: SearchResult) => void
}) {
  const Icon = ICON_OF[result.type]
  return (
    <CommandItem value={result.id} onSelect={() => onSelect(result)} className="gap-2.5">
      <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {/* Record data renders verbatim — never snake_cased (§3.3b guardrail). */}
        <span className="block truncate text-body text-text">{result.title}</span>
        {result.subtitle && (
          <span className="block truncate text-caption text-muted">{result.subtitle}</span>
        )}
      </span>
    </CommandItem>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <Prose className="mx-auto max-w-sm text-muted">{children}</Prose>
    </div>
  )
}

function Hotkey({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className={cn('rounded-sm border border-border px-1.5 py-0.5 text-text')}>{keys}</kbd>
      {label}
    </span>
  )
}
