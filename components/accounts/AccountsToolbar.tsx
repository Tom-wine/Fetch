'use client'

import * as React from 'react'
import { ArrowDownAZ, ArrowUpAZ, Download, FileUp, RefreshCw, UserPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { CLUBS } from '@/lib/registries/clubs'
import { membershipTypeSchema, accountStatusSchema } from '@/lib/api/schemas'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL, FilterSelect, type FilterOption } from '@/components/data/FilterSelect'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { ClubBadge } from '@/components/domain/ClubBadge'
import type { AccountStatus, ClubId, MembershipType } from '@/lib/types'
import { SORT_OPTIONS } from './columns'
import type { AccountsUrlState } from './url-state'

/**
 * §8.2's toolbar. It **wraps** (§9 rule 1) — the shared <Toolbar> is flex-wrap with
 * no overflow anywhere, so at 1280px the actions drop to a second row instead of the
 * bar scrolling and hiding a control on an on-sale morning.
 *
 * The `Columns` picker and the `⊞ view options` from the spec are the one popover
 * DataTable renders beside these actions — it holds density, rows per page and the
 * column toggles together.
 */

const MEMBERSHIP_TYPE_OPTIONS: FilterOption[] = membershipTypeSchema.options.map(
  (value: MembershipType) => ({ value, label: upperSnake(value) }),
)

const STATUS_OPTIONS: FilterOption[] = accountStatusSchema.options.map((value: AccountStatus) => ({
  value,
  label: upperSnake(value),
}))

const CLUB_OPTIONS: FilterOption[] = CLUBS.map((club) => ({
  value: club.id,
  // Club names are domain data — verbatim.
  label: club.name,
  icon: <ClubBadge club={club.id} variant="crest-only" size="sm" />,
}))

export function AccountsToolbar({
  state,
  tags,
  className,
}: {
  state: AccountsUrlState
  tags: string[]
  className?: string
}) {
  const tagOptions = React.useMemo<FilterOption[]>(
    () => tags.map((tag) => ({ value: tag, label: tag })),
    [tags],
  )

  return (
    <Toolbar
      className={className}
      search={
        <ToolbarSearch
          value={state.searchInput}
          onChange={state.setSearchInput}
          placeholder="Search by email, name or membership ID"
          className="sm:max-w-sm"
        />
      }
      filters={
        <>
          <FilterSelect
            noun="clubs"
            options={CLUB_OPTIONS}
            value={state.club ?? ALL}
            onChange={(value) => state.set({ club: value === ALL ? null : (value as ClubId) })}
          />
          <FilterSelect
            noun="membership types"
            ariaLabel="Filter by membership type"
            options={MEMBERSHIP_TYPE_OPTIONS}
            value={state.type ?? ALL}
            onChange={(value) =>
              state.set({ type: value === ALL ? null : (value as MembershipType) })
            }
          />
          <FilterSelect
            noun="statuses"
            options={STATUS_OPTIONS}
            value={state.status ?? ALL}
            onChange={(value) =>
              state.set({ status: value === ALL ? null : (value as AccountStatus) })
            }
          />
          <FilterSelect
            noun="tags"
            options={tagOptions}
            value={state.tag ?? ALL}
            onChange={(value) => state.set({ tag: value === ALL ? null : value })}
          />
          <SortControl state={state} />
        </>
      }
    />
  )
}

/**
 * Sorting lives here rather than on the column headers because this table is
 * server-paged and DataTable sorts client-side — a header click would reorder the 25
 * rows on screen and look like it had ordered all 64. Driving it from the query
 * string instead means the sort is real, and the link is shareable. See the ASK in
 * fetch-sync.md.
 */
function SortControl({ state }: { state: AccountsUrlState }) {
  const ascending = state.order === 'asc'

  return (
    <div className="flex items-center gap-1">
      <Select value={state.sort} onValueChange={(value) => state.set({ sort: value })}>
        <SelectTrigger
          aria-label="Sort by"
          className="h-9 w-auto min-w-[150px] gap-2 rounded-md border-border bg-surface text-body"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-surface">
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-body">
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
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text',
        )}
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

/**
 * The right-aligned half. DataTable renders these beside its own view-options
 * button, so the whole cluster wraps as one group.
 */
export function AccountsToolbarActions({
  matchingCount,
  onCheckAll,
  checking,
  onAdd,
  onImport,
  onExport,
  exporting,
}: {
  matchingCount: number
  onCheckAll: () => void
  checking: boolean
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  exporting: boolean
}) {
  return (
    <>
      {/* The count is in the label because "Check all" against a filtered view means
          all 12 Arsenal accounts, not all 64. */}
      <Button
        variant="secondary"
        label="Check all"
        count={matchingCount}
        onClick={onCheckAll}
        disabled={checking || matchingCount === 0}
      >
        <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden="true" />
      </Button>

      <Button variant="secondary" label="Add account" onClick={onAdd}>
        <UserPlus className="size-4" aria-hidden="true" />
      </Button>

      {/* §8.2 gives the gradient to Import — it is the action the whole product hangs on. */}
      <Button variant="gradient" label="Import" onClick={onImport}>
        <FileUp className="size-4" aria-hidden="true" />
      </Button>

      <Button
        variant="secondary"
        label="Export"
        onClick={onExport}
        disabled={exporting || matchingCount === 0}
      >
        <Download className="size-4" aria-hidden="true" />
      </Button>
    </>
  )
}
