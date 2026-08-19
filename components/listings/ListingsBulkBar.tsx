'use client'

import * as React from 'react'
import { Check, PauseCircle, PlayCircle, Tags, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BulkActionBar } from '@/components/data/BulkActionBar'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import type { Listing } from '@/lib/types'
import { RepriceDialog, type RepriceChange } from './RepriceDialog'
import type { DisplayCurrency } from './currency'

/**
 * §8.6's bulk bar — `Activate · Deactivate · Reprice · Delete` — plus the thing
 * server paging makes mandatory.
 *
 * The header checkbox can only reach the rows the browser holds, so the bar says
 * "12 listings selected on this page" and every action runs on exactly those twelve.
 * Acting on more takes an explicit escalation that fetches the matching rows and
 * holds them as a real set, after which every label, the reprice preview and the
 * delete confirmation all name the same real number.
 *
 * The rule: a bulk action never runs on a set whose size the operator cannot see.
 * Same affordance, same wording as /accounts, so it is learned once.
 */
export interface BulkEscalation {
  total: number
  onSelectAllMatching: () => void
  pending: boolean
}

export function ListingsBulkBar({
  listings,
  show,
  pageScoped,
  escalation,
  escalated,
  onSelectPageOnly,
  onActivate,
  onDeactivate,
  onReprice,
  onDelete,
  busy = false,
  onClear,
}: {
  listings: Listing[]
  show: DisplayCurrency
  pageScoped: boolean
  escalation: BulkEscalation | null
  escalated: boolean
  onSelectPageOnly: () => void
  onActivate: () => void
  onDeactivate: () => void
  onReprice: (changes: RepriceChange[]) => void
  onDelete: () => void
  busy?: boolean
  onClear: () => void
}) {
  const [repricing, setRepricing] = React.useState(false)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const count = listings.length

  if (count === 0) return null

  return (
    <div className="space-y-2">
      <BulkActionBar count={count} noun="listing" pageScoped={pageScoped} onClear={onClear}>
        <Button
          variant="secondary"
          size="sm"
          label="Activate"
          count={count}
          onClick={onActivate}
          disabled={busy}
        >
          <PlayCircle className="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          label="Deactivate"
          count={count}
          onClick={onDeactivate}
          disabled={busy}
        >
          <PauseCircle className="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          label="Reprice"
          count={count}
          onClick={() => setRepricing(true)}
          disabled={busy}
        >
          <Tags className="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="danger"
          size="sm"
          label="Delete"
          count={count}
          onClick={() => setConfirmingDelete(true)}
          disabled={busy}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </BulkActionBar>

      {escalation && (
        <button
          type="button"
          onClick={escalation.onSelectAllMatching}
          disabled={escalation.pending}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-body text-primary-ink transition-colors duration-150 hover:bg-primary/10 disabled:opacity-60"
        >
          {escalation.pending
            ? 'Selecting the whole set…'
            : `Select all ${escalation.total} listings matching these filters`}
        </button>
      )}

      {escalated && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-4 py-2 text-body text-primary-ink">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          <span>All {count} listings matching these filters are selected, across every page.</span>
          <button
            type="button"
            onClick={onSelectPageOnly}
            className="underline underline-offset-4 hover:text-text"
          >
            Select this page only
          </button>
        </div>
      )}

      <RepriceDialog
        open={repricing}
        onOpenChange={setRepricing}
        listings={listings}
        show={show}
        busy={busy}
        onConfirm={(changes) => {
          setRepricing(false)
          onReprice(changes)
        }}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        verb="Delete"
        count={count}
        noun="listing"
        description="The listings are removed from their marketplaces and from Fetch.io. The tickets behind them are not deleted. This cannot be undone."
        onConfirm={() => {
          setConfirmingDelete(false)
          onDelete()
        }}
      />
    </div>
  )
}
