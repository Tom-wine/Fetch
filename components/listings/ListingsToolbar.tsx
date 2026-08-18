'use client'

import * as React from 'react'
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL, FilterSelect, type FilterOption } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { AccountPicker } from '@/components/fixtures/AccountPicker'
import { LISTING_STATUSES } from '@/components/domain/StatusChip'
import type { ListingStatus } from '@/lib/types'
import { CurrencySelect } from './CurrencySelect'
import { PlatformChips, PlatformFilter } from './PlatformControls'
import { LISTING_SORTS } from './sorting'
import type { ListingsUrlState } from './url-state'

/**
 * §8.6's toolbar. It **wraps** (§9 rule 1) — nothing here scrolls sideways at any
 * width, so a control can never hide itself on an on-sale morning.
 *
 * Two rows by design rather than by accident: row 1 narrows the SET of rows
 * (search, platform, account, status), row 2 changes how that set READS (the
 * platform quick-toggles and the currency normaliser). The column-visibility picker
 * and rows-per-page live in DataTable's own `VIEW` popover, which renders beside
 * these — the same single picker /accounts and /mytickets use, rather than a second
 * one holding a duplicate copy of the same toggles.
 *
 * `Account ▾` is /mytickets' searchable picker, imported rather than copied. Sixty-
 * four accounts are all `name@domain`, so a plain <Select> is unscannable and the
 * search has to run on the API. It is announced in fetch-sync.md as a candidate to
 * promote into components/domain.
 */

const STATUS_OPTIONS: FilterOption[] = LISTING_STATUSES.map((value) => ({
  value,
  label: upperSnake(value),
}))

export function ListingsToolbar({
  state,
  className,
}: {
  state: ListingsUrlState
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <Toolbar
        search={
          <ToolbarSearch
            value={state.searchInput}
            onChange={state.setSearchInput}
            placeholder="Search by fixture, listing ID or block"
            className="sm:max-w-sm"
          />
        }
        filters={
          <>
            <PlatformFilter
              value={state.platforms}
              onChange={(platforms) => state.set({ platforms })}
            />
            <AccountPicker
              value={state.account}
              onChange={(account) => state.set({ account })}
            />
            <FilterSelect
              noun="statuses"
              options={STATUS_OPTIONS}
              value={state.status ?? ALL}
              onChange={(value) =>
                state.set({ status: value === ALL ? null : (value as ListingStatus) })
              }
            />
            <SortControl state={state} />
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PlatformChips
          value={state.platforms}
          onChange={(platforms) => state.set({ platforms })}
        />
        <CurrencySelect
          value={state.show}
          onChange={(show) => state.set({ show })}
          className="sm:ml-auto"
        />
      </div>
    </div>
  )
}

/**
 * The under-`md` sorting UI, and only that — `md:hidden`.
 *
 * Above `md` the column headers are the sorting UI and this would be a second control
 * writing the same params. Below `md` the table is replaced by stacked cards, which
 * have no headers to click, so without this there is no way to sort on a phone at
 * all. Both surfaces read the one registry in ./sorting.ts, so they offer exactly the
 * same set — and only fields `GET /listings` can actually order by.
 */
function SortControl({ state }: { state: ListingsUrlState }) {
  const ascending = state.order === 'asc'

  return (
    <div className="flex items-center gap-1 md:hidden">
      <Select value={state.sortField} onValueChange={(sort) => state.set({ sort })}>
        <SelectTrigger
          aria-label="Sort by"
          className="h-9 w-auto min-w-[150px] gap-2 rounded-md border-border bg-surface text-body"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-surface">
          {LISTING_SORTS.map((option) => (
            <SelectItem key={option.field} value={option.field} className="text-body">
              Sort by {option.label.toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() => state.set({ order: ascending ? 'desc' : 'asc' })}
        aria-label={
          ascending ? 'Sorted ascending. Sort descending' : 'Sorted descending. Sort ascending'
        }
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
      >
        {ascending ? (
          <ArrowDownAZ className="size-4" aria-hidden="true" />
        ) : (
          <ArrowUpAZ className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
