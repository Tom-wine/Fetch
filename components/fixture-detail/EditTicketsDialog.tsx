'use client'

import * as React from 'react'

import { toMajorInput, toMinor } from '@/lib/format/money'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Prose, SectionLabel } from '@/components/ui/typography'
import type { Ticket, TicketVisibility } from '@/lib/types'
import type { TicketPatch } from '@/lib/api/schemas'

/**
 * `Actions -> Edit` (§8.5). One dialog, `PATCH /tickets/:id` per selected seat.
 *
 * WHICH FIELDS APPEAR DEPENDS ON HOW MANY SEATS ARE SELECTED, and that is the whole
 * design. Price and visibility are properties of the OFFER, so setting them across a
 * selection is a sentence an operator means: "these four at £180, all hidden". Block,
 * row and seat are properties of the SEAT — writing one row number across four
 * different seats would quietly destroy where they actually are, so they are only
 * offered when the selection is a single ticket.
 *
 * Every field starts empty-ish rather than pre-filled from the first row: a blank
 * price means "leave every price alone", which is the only safe default for a bulk
 * edit. With one seat selected the fields ARE pre-filled, because then "the current
 * value" is unambiguous and editing from it is what the operator expects.
 */

/** `visibility` needs a third option for "don't touch it". */
const KEEP = '__keep__'

export function EditTicketsDialog({
  open,
  onOpenChange,
  tickets,
  onConfirm,
  busy = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The current selection, in the order the table holds it. */
  tickets: Ticket[]
  /** Called with only the keys that changed. Never called with an empty patch. */
  onConfirm: (patch: TicketPatch) => void
  busy?: boolean
}) {
  const count = tickets.length
  const single = count === 1 ? (tickets[0] ?? null) : null
  const currency = tickets[0]?.currency ?? 'GBP'

  const [price, setPrice] = React.useState('')
  const [visibility, setVisibility] = React.useState<string>(KEEP)
  const [block, setBlock] = React.useState('')
  const [row, setRow] = React.useState('')
  const [seat, setSeat] = React.useState('')

  /**
   * Re-seed every time the dialog opens. The selection can change while it is closed,
   * and a field still holding the last seat's row number is how an operator edits the
   * wrong thing without ever seeing a wrong value.
   */
  React.useEffect(() => {
    if (!open) return
    setPrice(single ? toMajorInput(single.price, single.currency) : '')
    setVisibility(single ? single.visibility : KEEP)
    setBlock(single?.block ?? '')
    setRow(single?.row ?? '')
    setSeat(single?.seat ?? '')
  }, [open, single])

  const priceMinor = price.trim() ? toMinor(price, currency) : null
  const priceInvalid = price.trim().length > 0 && (priceMinor === null || priceMinor <= 0)

  const patch: TicketPatch = {}
  if (priceMinor !== null && priceMinor > 0 && priceMinor !== single?.price)
    patch.price = priceMinor
  if (visibility !== KEEP && visibility !== single?.visibility) {
    patch.visibility = visibility as TicketVisibility
  }
  if (single) {
    if (block.trim() && block.trim() !== single.block) patch.block = block.trim()
    if (row.trim() && row.trim() !== single.row) patch.row = row.trim()
    if (seat.trim() && seat.trim() !== single.seat) patch.seat = seat.trim()
  }

  const changed = Object.keys(patch).length > 0
  const noun = count === 1 ? 'ticket' : 'tickets'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] max-w-none">
        <DialogHeader>
          <DialogTitle>{count === 1 ? 'Edit ticket' : `Edit ${count} tickets`}</DialogTitle>
          <DialogDescription className="mt-1">
            {single
              ? `Seat ${single.seat}, row ${single.row}, ${single.block}.`
              : `Leave a field blank to leave it as it is on all ${count} seats.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-price">
              <SectionLabel>{`price (${currency})`}</SectionLabel>
            </Label>
            <Input
              id="edit-price"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={single ? undefined : 'Unchanged'}
              aria-invalid={priceInvalid}
            />
            {priceInvalid && (
              <Prose className="text-[12px] text-danger-ink">
                That is not a price. Enter a number above zero, like 180 or 180.50.
              </Prose>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-visibility">
              <SectionLabel>visibility</SectionLabel>
            </Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger id="edit-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {!single && <SelectItem value={KEEP}>Unchanged</SelectItem>}
                <SelectItem value="visible">Visible to buyers</SelectItem>
                <SelectItem value="hidden">Hidden from buyers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {single ? (
            <div className="grid grid-cols-3 gap-3">
              <Field id="edit-block" label="block" value={block} onChange={setBlock} />
              <Field id="edit-row" label="row" value={row} onChange={setRow} />
              <Field id="edit-seat" label="seat" value={seat} onChange={setSeat} />
            </div>
          ) : (
            // Not a disabled field: an input that cannot be used still reads as
            // something the operator failed to unlock. Say why it is absent instead.
            <Prose className="text-[12px] leading-snug text-muted">
              Block, row and seat describe where a seat physically is, so they can only be edited
              one ticket at a time. Select a single row to change them.
            </Prose>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" label="Cancel" onClick={() => onOpenChange(false)} />
          <Button
            label={`Save ${noun}`}
            disabled={!changed || priceInvalid || busy}
            onClick={() => onConfirm(patch)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        <SectionLabel>{label}</SectionLabel>
      </Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
