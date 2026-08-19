'use client'

import * as React from 'react'

import { getPlatform } from '@/lib/registries/platforms'
import { useFixtureListings } from '@/lib/api/hooks/useFixtureDetail'
import { Money } from '@/components/domain/Money'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Prose, SectionLabel } from '@/components/ui/typography'

/**
 * `Actions -> Associate listing` (§8.5).
 *
 * The seats are already for sale somewhere Fetch.io did not put them — an operator
 * listed them by hand, or another tool did — and this records that fact. It is the
 * opposite of `List`, which creates a listing and mints its own marketplace id.
 *
 * The typed id is matched against this fixture's listings — fetched only while the
 * dialog is open — and a match is shown in full: marketplace, price, block, quantity,
 * BEFORE the button goes live. An id is eight characters of noise; the operator
 * confirms a listing, not a string. An id with no local match is still allowed
 * through, because the server is the authority on what exists and answers with a 422
 * naming the id if it disagrees.
 */
export function AssociateListingDialog({
  open,
  onOpenChange,
  count,
  fixtureId,
  onConfirm,
  busy = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  fixtureId: string
  onConfirm: (listingId: string) => void
  busy?: boolean
}) {
  const [raw, setRaw] = React.useState('')
  const { listings } = useFixtureListings(open ? fixtureId : null)

  React.useEffect(() => {
    if (open) setRaw('')
  }, [open])

  const typed = raw.trim()
  const match = React.useMemo(
    () =>
      typed
        ? (listings.find((l) => l.listingId.toLowerCase() === typed.toLowerCase()) ?? null)
        : null,
    [listings, typed],
  )

  const noun = count === 1 ? 'seat' : 'seats'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none">
        <DialogHeader>
          <DialogTitle>Associate listing</DialogTitle>
          <DialogDescription className="mt-1">
            {`Link ${count} ${noun} to a listing that already exists on a marketplace. No new listing is created.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="associate-listing-id">
              <SectionLabel>marketplace listing id</SectionLabel>
            </Label>
            <Input
              id="associate-listing-id"
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="ST-26611413"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {match ? (
            <div className="rounded-md border border-success/30 bg-success/8 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-body font-semibold text-text">
                  {getPlatform(match.platform).name}
                </span>
                <Money amount={match.price} currency={match.currency} />
              </div>
              <Prose className="mt-1 block text-[12px] leading-snug text-muted">
                {`${match.block} · ${match.quantity} ${match.quantity === 1 ? 'seat' : 'seats'} · ${match.status.toLowerCase()}`}
              </Prose>
            </div>
          ) : typed ? (
            <Prose className="text-[12px] leading-snug text-muted">
              No listing with that id is loaded for this fixture. You can still link it — the server
              has the final say and will name the id if it disagrees.
            </Prose>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" label="Cancel" onClick={() => onOpenChange(false)} />
          <Button label="Link listing" disabled={!typed || busy} onClick={() => onConfirm(typed)} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
