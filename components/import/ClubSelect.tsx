'use client'

import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CLUBS, getClub } from '@/lib/registries/clubs'
import type { ClubId } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { similarity } from './fuzzy'

/**
 * `Club ▾` — searchable, with the crest in the option (§8.3).
 *
 * A plain `<Select>` of twenty clubs is a scroll, and the operator filling this form
 * has a spreadsheet open beside it: they type "spurs", not "T". So the list is
 * filtered by the same fuzzy matcher the CSV importer uses, which means the picker
 * and the importer agree on what "Spurs" means — one vocabulary, not two.
 *
 * Keyboard-first, because §8.3 says so: ↑/↓ move, Enter picks, Escape closes and
 * returns focus to the trigger, and typing filters without ever leaving the field.
 */
export function ClubSelect({
  value,
  onChange,
  id,
  invalid,
  placeholder = 'Choose a club',
  className,
  disabled,
}: {
  value: ClubId | null
  onChange: (club: ClubId) => void
  id?: string
  invalid?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  const matches = React.useMemo(() => {
    const needle = term.trim()
    if (!needle) return CLUBS

    return CLUBS.map((club) => ({
      club,
      score: Math.max(
        similarity(needle, club.name),
        similarity(needle, club.short),
        similarity(needle, club.id),
        similarity(needle, club.city),
        // A prefix is what someone typing three letters means, and Dice under-scores
        // it badly: "tot" against "Tottenham Hotspur" is 0.24.
        club.name.toLowerCase().startsWith(needle.toLowerCase()) ? 0.95 : 0,
      ),
    }))
      .filter((entry) => entry.score >= 0.34)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.club)
  }, [term])

  // Reset the highlight whenever the visible set changes, or it points at a row
  // that scrolled out of existence.
  React.useEffect(() => setActive(0), [term, open])

  React.useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function pick(club: ClubId) {
    onChange(club)
    setOpen(false)
    setTerm('')
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const club = matches[active]
      if (club) pick(club.id)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(matches.length - 1)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border bg-surface px-3 text-body text-text transition-colors duration-150 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-danger/60' : 'border-border',
          className,
        )}
      >
        {value ? (
          <ClubBadge club={value} variant="full" size="sm" className="min-w-0 flex-1" />
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-faint">{placeholder}</span>
        )}
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] border-border bg-surface p-0"
      >
        <div className="relative border-b border-border p-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a club, a nickname or a city"
            aria-label="Search clubs"
            className="h-8 border-border bg-surface-raised pl-8 text-body"
          />
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto py-1" role="listbox">
          {matches.length === 0 ? (
            <p className="px-3 py-4 text-center font-prose text-prose text-muted">
              No club matches that. Fetch.io covers the twenty Premier League clubs.
            </p>
          ) : (
            matches.map((club, index) => (
              <button
                key={club.id}
                type="button"
                role="option"
                aria-selected={club.id === value}
                data-active={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(club.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-body transition-colors duration-150',
                  index === active ? 'bg-surface-hover text-text' : 'text-muted',
                )}
              >
                <ClubBadge club={club.id} variant="full" size="sm" className="min-w-0 flex-1" />
                <span className="shrink-0 text-caption text-faint">{club.city}</span>
                {club.id === value && (
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { getClub }
