'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Compass, Key, Play, Route, Ticket, type LucideIcon } from 'lucide-react'

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
import { searchGuides } from '@/lib/guides/search'
import { useTour } from '@/components/tour/TourProvider'
import { MIN_QUERY_LENGTH, usePaletteSearch, useRecentSearches } from './useCommandPalette'

/**
 * ⌘K / Ctrl+K (§7 #5).
 *
 * Accounts by email, name or membership id; fixtures by either team; and the screens
 * themselves — all from one `GET /search?q=`, grouped
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
 *
 * COMMANDS come first, above anything the server matched. The palette could only ever
 * find RECORDS, so the app's central action was reachable from exactly one screen: an
 * operator on /mytickets who wanted to start a run had to navigate to /ballots first.
 * They are local and match on their own keywords, so they cost no request and appear
 * with nothing typed, which is where a first-time visitor looks for "what can this do".
 */

interface Command {
  id: string
  title: string
  subtitle: string
  /** Typed words that should surface it — `run` finds START_RUN, so does `ballot`. */
  keywords: string[]
  /** Where it goes, for the commands that are a navigation. */
  href?: string
  /** What it does, for the ones that are not. */
  action?: 'tour'
  icon: LucideIcon
}

const COMMANDS: Command[] = [
  {
    id: 'cmd_start_run',
    title: 'Start a run',
    subtitle: 'Enter the ready accounts into a ballot',
    keywords: ['start', 'run', 'ballot', 'enter', 'launch', 'new'],
    // The launcher is a dialog on /ballots rather than a route, so the command asks
    // that screen to open it. The param is in the URL for the same reason everything
    // else is: this link works pasted into a chat message.
    href: '/ballots?tab=pool&start=1',
    icon: Play,
  },
  {
    id: 'cmd_take_tour',
    title: 'Take the tour',
    subtitle: 'Nine steps through the loop, from accounts to failures',
    keywords: ['tour', 'guide', 'tutorial', 'walkthrough', 'help', 'start', 'intro'],
    action: 'tour',
    icon: Route,
  },
]

function matchCommands(query: string): Command[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return COMMANDS
  return COMMANDS.filter(
    (command) =>
      command.title.toLowerCase().includes(needle) ||
      command.keywords.some((word) => word.startsWith(needle)),
  )
}

const GROUPS: Array<{ type: SearchResultType; label: string; icon: LucideIcon }> = [
  { type: 'account', label: 'Accounts', icon: Key },
  { type: 'fixture', label: 'Fixtures', icon: Ticket },
  { type: 'navigation', label: 'Navigation', icon: Compass },
]

const ICON_OF: Record<SearchResultType, LucideIcon> = {
  account: Key,
  fixture: Ticket,
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
  const tour = useTour()
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
  const commands = matchCommands(query)

  /**
   * The guides, searched in the browser.
   *
   * `GET /search` answers accounts, fixtures and screens; documentation is not in the
   * database and should not be — it is a build artefact. So the palette asks two
   * sources and shows one list, and the operator never has to know which of the two
   * knew the answer. A heading hit lands on the paragraph, not the page.
   */
  const guides = React.useMemo(() => (typing ? searchGuides(query) : []), [query, typing])
  const grouped = GROUPS.map((group) => ({
    ...group,
    items: results.filter((result) => result.type === group.type),
  })).filter((group) => group.items.length > 0)

  const runCommand = React.useCallback(
    (command: Command) => {
      onOpenChange(false)
      // The palette closes first either way: the tour's first highlight has to land on
      // the page, not on the dialog that launched it.
      if (command.action === 'tour') tour.start()
      else if (command.href) router.push(command.href)
    },
    [onOpenChange, router, tour],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] w-[min(640px,calc(100vw-2rem))] max-w-none translate-y-0 gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        {/* Named for assistive tech; the input below is the visible label. */}
        <DialogTitle className="sr-only">Search Fetch.io</DialogTitle>
        <DialogDescription className="sr-only">
          Search accounts, fixtures and screens. Use the arrow keys to move and Enter to open.
        </DialogDescription>

        <Command shouldFilter={false} loop className="bg-transparent">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search accounts, fixtures, screens…"
          />

          {/*
            Tall enough that four groups are readable at once. The palette's normal
            result is one hit in each of accounts, fixtures and navigation,
            and a list that shows two of them makes the other two look absent rather
            than below the fold.
          */}
          <CommandList className="max-h-[min(70vh,560px)]">
            {/* Above the search states, not inside them: an action is available whether
                or not the server has answered, and whether or not anything matched. */}
            {!error && commands.length > 0 && (
              <CommandGroup heading="Commands">
                {commands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={command.id}
                    onSelect={() => runCommand(command)}
                    className="gap-2.5"
                  >
                    <command.icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-text">{command.title}</span>
                      <span className="block truncate text-caption text-muted">
                        {command.subtitle}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!error && guides.length > 0 && (
              <CommandGroup heading="Guides">
                {guides.map((hit) => (
                  <CommandItem
                    key={hit.id}
                    value={hit.id}
                    onSelect={() => {
                      onOpenChange(false)
                      router.push(hit.href)
                    }}
                    className="gap-2.5"
                  >
                    <BookOpen className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-text">{hit.title}</span>
                      <span className="block truncate text-caption text-muted">{hit.subtitle}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

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
                  membership id, and fixtures on either team.
                </Hint>
              )
            ) : loading ? (
              <Hint>Searching…</Hint>
            ) : grouped.length === 0 ? (
              commands.length > 0 || guides.length > 0 ? null : (
                <CommandEmpty>
                  <Prose className="text-muted">
                    Nothing matches <span className="font-mono text-text">{settled}</span>.
                  </Prose>
                </CommandEmpty>
              )
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
