'use client'

import * as React from 'react'
import { ArrowUpDown, KeyRound, Layers, LogIn, RotateCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { FilterSelect, type FilterOption } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Account, Ticket } from '@/lib/types'
import { FinancePopover } from './FinancePopover'
import { TICKET_SORTS } from './sorting'
import type { FixtureDetailUrlState } from './url-state'

/**
 * The §8.5 left-hand toolbar. It is TWO rows by construction, not by accident:
 *
 *   row 1  search · Finance (N) · Auto Group · Actions · Reset PW · Relogin · Refresh
 *   row 2  All accounts · All blocks · All rows
 *
 * Both rows are `flex-wrap` with no `overflow-x` anywhere, so at 1280px — where this
 * bar shares the width with a 36% context panel — the controls drop onto another line
 * rather than the bar scrolling sideways and hiding half of them (§9 rule 1).
 *
 * Nothing here holds filter state. Every control reads from and writes to the URL, so
 * the bar and the table cannot disagree about what is on screen.
 */
export function TicketsToolbar({
  url,
  accounts,
  accountIds,
  blocks,
  rows,
  selected,
  fixtureTickets,
  actionsMenu,
  onRefresh,
  refreshing,
  onMaintenance,
  maintenanceBusy,
}: {
  url: FixtureDetailUrlState
  accounts: Map<string, Account>
  /** Account ids that actually hold a seat on this fixture. */
  accountIds: string[]
  blocks: string[]
  rows: string[]
  selected: Ticket[]
  /** Every seat on the fixture — what Finance falls back to with nothing selected. */
  fixtureTickets: Ticket[]
  /** The shared `ActionsMenu`, built by `TicketActions` so it can own its dialogs. */
  actionsMenu: React.ReactNode
  onRefresh: () => void
  refreshing: boolean
  onMaintenance: (action: 'relogin' | 'reset-password') => void
  maintenanceBusy: boolean
}) {
  const accountOptions = React.useMemo<FilterOption[]>(
    () =>
      accountIds
        .map((id) => ({ value: id, label: accounts.get(id)?.email ?? id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'en')),
    [accountIds, accounts],
  )

  const blockOptions = React.useMemo<FilterOption[]>(
    () => blocks.map((block) => ({ value: block, label: block })),
    [blocks],
  )

  const rowOptions = React.useMemo<FilterOption[]>(
    () => rows.map((row) => ({ value: row, label: `Row ${row}` })),
    [rows],
  )

  // Reset PW and Relogin act on the ACCOUNTS behind the selected seats, so the count
  // that matters is the number of distinct logins, not the number of tickets.
  const accountCount = new Set(selected.map((t) => t.accountId)).size
  const noSelection = selected.length === 0

  return (
    <div className="space-y-2">
      <Toolbar
        search={
          <ToolbarSearch
            value={url.searchInput}
            onChange={url.setSearchInput}
            placeholder="Search seats"
            // Narrower than the shared default. This toolbar carries six controls
            // beside the box and only ~64% of the width to do it in, so every pixel
            // the search does not claim is one that keeps row 1 on one line.
            className="sm:max-w-[220px]"
          />
        }
        actions={
          <>
            <FinancePopover
              tickets={noSelection ? fixtureTickets : selected}
              selectionCount={selected.length}
              scoped={!noSelection}
            />

            <AutoGroupToggle
              active={url.autoGroup}
              onToggle={() => url.set({ autoGroup: !url.autoGroup })}
              count={selected.length}
            />

            {actionsMenu}

            <Maintenance
              label="Reset PW"
              icon={<KeyRound className="size-4" aria-hidden="true" />}
              disabled={noSelection || maintenanceBusy}
              hint={
                noSelection
                  ? 'Select seats first. A password reset acts on the accounts that hold them.'
                  : `Resets the password on ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'}. The club emails the new one.`
              }
              onClick={() => onMaintenance('reset-password')}
            />

            <Maintenance
              label="Relogin"
              icon={<LogIn className="size-4" aria-hidden="true" />}
              disabled={noSelection || maintenanceBusy}
              hint={
                noSelection
                  ? 'Select seats first. A relogin acts on the accounts that hold them.'
                  : `Signs ${accountCount} ${accountCount === 1 ? 'account' : 'accounts'} back in.`
              }
              onClick={() => onMaintenance('relogin')}
            />

            <Button
              label="Refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Re-check the seats on this fixture"
            >
              <RotateCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden="true" />
            </Button>
          </>
        }
      />

      <Toolbar
        filters={
          <>
            <FilterSelect
              value={url.account}
              onChange={(account) => url.set({ account })}
              options={accountOptions}
              noun="accounts"
            />
            <FilterSelect
              value={url.block}
              onChange={(block) => url.set({ block })}
              options={blockOptions}
              noun="blocks"
            />
            <FilterSelect
              value={url.row}
              onChange={(row) => url.set({ row })}
              options={rowOptions}
              noun="rows"
              ariaLabel="Filter by seat row"
            />
            {/* Only where there is no header to click: under md the table is stacked
                cards, and cards have no headers. Above md the headers are the sort UI. */}
            <SortControl url={url} className="md:hidden" />
          </>
        }
      />
    </div>
  )
}

/**
 * `Auto Group`. A grouped seat is a seat that was bought and will be sold as a lot, so
 * acting on one of them and not the rest is almost always a mistake. With this on,
 * touching one seat brings its group with it.
 *
 * It is a preference rather than a filter, which is why it does not reset the page.
 */
function AutoGroupToggle({
  active,
  onToggle,
  count,
}: {
  active: boolean
  onToggle: () => void
  count: number
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={active}
            className={cn(
              'flex h-9 items-center gap-2 rounded-md border px-3 font-mono text-btn font-semibold transition-colors duration-150',
              active
                ? 'border-primary/40 bg-primary/12 text-primary-ink'
                : 'border-border bg-surface text-muted hover:bg-surface-hover hover:text-text',
            )}
          >
            <Layers className="size-4" aria-hidden="true" />
            {upperSnake('Auto Group')}
            {count > 0 && <span>({count})</span>}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] font-prose text-prose">
          {active
            ? 'On: selecting one seat also selects the rest of its group.'
            : 'Off: seats are selected one at a time, even when they were bought together.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** `Reset PW` and `Relogin` — warning-tinted, and each says what it will touch. */
function Maintenance({
  label,
  icon,
  hint,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  hint: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A span wrapper, because a disabled button emits no pointer events and the
              tooltip explaining WHY it is disabled would never appear. */}
          <span className="inline-flex">
            <Button
              variant="warning"
              label={label}
              disabled={disabled}
              onClick={onClick}
              aria-label={hint}
            >
              {icon}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] font-prose text-prose">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * The small-screen sort control. Above `md` the column headers do this job, and two
 * surfaces for one piece of state is how they end up disagreeing — so this one is
 * hidden there rather than duplicated.
 */
function SortControl({ url, className }: { url: FixtureDetailUrlState; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Not `FilterSelect`: that adds an "All …" row, and a list always has exactly
          one order. There is nothing here for "all" to mean. */}
      <Select value={url.sortField} onValueChange={(sort) => url.set({ sort })}>
        <SelectTrigger
          aria-label="Sort seats by"
          className="h-9 w-auto min-w-[130px] gap-2 rounded-md border-border bg-surface text-body"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-surface">
          {TICKET_SORTS.map((sort) => (
            <SelectItem key={sort.field} value={sort.field} className="text-body">
              {sort.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => url.set({ order: url.order === 'asc' ? 'desc' : 'asc' })}
        aria-label={url.order === 'asc' ? 'Sort ascending' : 'Sort descending'}
        className="flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text"
      >
        <ArrowUpDown className="size-4" aria-hidden="true" />
        <span className="sr-only">{url.order}</span>
      </button>
    </div>
  )
}
