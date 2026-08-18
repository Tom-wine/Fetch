'use client'

import * as React from 'react'

import { Num } from '@/components/domain/Money'
import { PlatformBadge } from '@/components/domain/PlatformBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { StatusChip } from '@/components/domain/StatusChip'
import { Checkbox } from '@/components/ui/checkbox'
import type { Account, Listing } from '@/lib/types'
import { PriceCell } from './PriceCell'
import type { DisplayCurrency } from './currency'

/**
 * Under `md` the table becomes stacked cards (§9 rule 3) — and the price is still
 * editable, because "that listing is 20 under the next one, fix it now" is exactly
 * the thing an operator does from a phone (§9 rule 17). It is the same <PriceCell>
 * the table uses, so the commit, the toast, the Undo and the rollback behave
 * identically on both surfaces.
 *
 * The checkbox is here on purpose: DataTable's card layout drops the select column,
 * which would otherwise leave the bulk bar unreachable below `md`.
 */
export function ListingCard({
  listing,
  account,
  show,
  selected,
  onSelectedChange,
  onCommitPrice,
  actions,
}: {
  listing: Listing
  account: Account | undefined
  show: DisplayCurrency
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  onCommitPrice: (price: number) => void
  actions: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelectedChange(value === true)}
          aria-label={`Select listing ${listing.listingId}`}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          {/* Fixture names are domain data — verbatim. */}
          <div className="truncate text-body text-text">{listing.fixtureName}</div>
          <div className="truncate text-caption text-faint">
            <RelativeTime value={listing.kickoff} ramp />
          </div>
        </div>
        <div className="shrink-0">{actions}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PlatformBadge platform={listing.platform} />
        <StatusChip status={listing.status} kind="listing" />
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2"
        // A tap on the price must open the editor, not the card underneath it.
        onClick={(e) => e.stopPropagation()}
      >
        <PriceCell listing={listing} show={show} onCommit={onCommitPrice} className="-ml-2" />
        <span className="text-caption text-muted">
          <Num value={listing.quantity} /> × {listing.block}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
        <span className="truncate font-mono text-muted">{listing.listingId}</span>
        {account && <span className="truncate text-faint">{account.email}</span>}
      </div>
    </div>
  )
}
