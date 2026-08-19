'use client'

import * as React from 'react'
import { Check, ChevronDown, Search, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ALL } from '@/components/data/FilterSelect'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount, useAccounts } from '@/lib/api/hooks/useAccounts'
import type { AccountFilters } from '@/lib/api/endpoints'

/**
 * `Account ▾` — a searchable account picker.
 *
 * A plain `<Select>` cannot do this job: sixty-four club accounts are all
 * `name@domain`, so the list is unscannable without a filter, and the one the
 * operator wants is remembered by a fragment of the address rather than its position.
 * The search runs on the API (`q`), not on the loaded page, so it keeps working when
 * an operator has more accounts than one page holds.
 *
 * NOTE for session-a: /accounts needs the same control. It lives here rather than in
 * components/domain because Part 6 owns components/fixtures — say the word in
 * fetch-sync.md and Tom can promote it.
 */
export function AccountPicker({
  value,
  onChange,
  className,
}: {
  /** An account id, or ALL. */
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [term, setTerm] = React.useState('')
  const search = useDebounced(term, 150)

  const filters = React.useMemo<AccountFilters>(
    () => ({ pageSize: 50, sort: 'email', order: 'asc', q: search || undefined }),
    [search],
  )

  // One query key per search term, shared with the filters popover through the Query
  // cache — both surfaces list accounts, and neither should fetch them twice.
  const accounts = useAccounts(filters)
  const rows = accounts.data?.data ?? []
  const total = accounts.data?.meta?.total ?? rows.length

  // The selected account may not be in the current search results, so its label comes
  // from its own record rather than from the list.
  const selected = useAccount(value === ALL ? null : value)
  const label = value === ALL ? 'All accounts' : (selected.data?.data.email ?? 'Account')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Filter by account"
        className={cn(
          'flex h-9 w-auto max-w-[240px] min-w-[150px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-body text-text transition-colors duration-150 hover:bg-surface-hover',
          value !== ALL && 'border-primary/30 bg-primary/8 text-primary-ink',
          className,
        )}
      >
        <Users className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[320px] border-border bg-surface p-0">
        <div className="relative border-b border-border p-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by email, name or membership ID"
            aria-label="Search accounts"
            className="h-8 border-border bg-surface-raised pl-8 text-body"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          <Row selected={value === ALL} onClick={() => select(ALL)}>
            <span className="flex-1 truncate text-left">All accounts</span>
            <span className="text-caption text-faint tabular-nums">{total}</span>
          </Row>

          {accounts.isPending ? (
            <div className="space-y-2 px-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5" style={{ width: `${85 - i * 12}%` }} />
              ))}
            </div>
          ) : accounts.error ? (
            <p className="px-3 py-4 text-center font-prose text-prose text-muted">
              The account list did not load. Close this and try again.
            </p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-4 text-center font-prose text-prose text-muted">
              No account matches that search.
            </p>
          ) : (
            rows.map((account) => (
              <Row
                key={account.id}
                selected={account.id === value}
                onClick={() => select(account.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-left">{account.email}</span>
                  <span className="block truncate text-left text-caption text-faint">
                    {account.membershipId}
                  </span>
                </span>
                <ClubBadge club={account.club} variant="crest-only" size="sm" />
              </Row>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )

  function select(next: string) {
    onChange(next)
    setOpen(false)
    setTerm('')
  }
}

function Row({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-body transition-colors duration-150 hover:bg-surface-hover',
        selected ? 'text-text' : 'text-muted',
      )}
    >
      {children}
      {selected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  )
}

/** Keeps a keystroke from becoming a request. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
