'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Listing } from '@/lib/types'
import { displayMoney, toMajorInput, toMinor, type DisplayCurrency } from './currency'

/**
 * The §8.6 inline price edit.
 *
 * Click the value and it becomes a focused input; Enter commits, Escape cancels,
 * blur commits. The commit is optimistic — the new figure is on screen before the
 * request lands — and the toast carries an Undo. A rejected write rolls the row back
 * to the price the server still holds, with an error toast (see
 * `useUpdateListing`).
 *
 * Two details that are not decoration:
 *
 * 1. The DISPLAY is normalised (`≈£41.65`, original and rate in the tooltip) but the
 *    EDIT is always in the listing's own currency, with the code beside the field.
 *    Committing a converted number would put a value through an indicative rate and
 *    then store it as fact — the marketplace would be repriced to a number nobody
 *    chose.
 * 2. Every key is stopped from bubbling. DataTable's rows are focusable and handle
 *    Space (toggle selection) and the arrows (move between rows); without this, a
 *    space inside the price field would silently select the row instead of typing.
 */
export function PriceCell({
  listing,
  show,
  onCommit,
  className,
}: {
  listing: Listing
  show: DisplayCurrency
  /** Called with the new price in MINOR units of the listing's own currency. */
  onCommit: (price: number) => void
  className?: string
}) {
  const { settings } = useLocale()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [invalid, setInvalid] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Escape closes the field, which fires blur — and blur commits. The flag is what
  // keeps a cancel from being saved a millisecond later.
  const cancelled = React.useRef(false)

  const display = displayMoney(
    { amount: listing.price, currency: listing.currency },
    show,
    settings,
  )

  React.useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function open() {
    setDraft(toMajorInput(listing.price, listing.currency))
    setInvalid(false)
    cancelled.current = false
    setEditing(true)
  }

  function cancel() {
    cancelled.current = true
    setEditing(false)
    setInvalid(false)
  }

  /** Returns false when the draft is not a price, so Enter can keep the field open. */
  function commit(): boolean {
    const minor = toMinor(draft, listing.currency)
    if (minor === null || minor <= 0) {
      setInvalid(true)
      return false
    }
    setEditing(false)
    setInvalid(false)
    // A no-op edit must not fire a request, an optimistic update or a toast.
    if (minor !== listing.price) onCommit(minor)
    return true
  }

  if (editing) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div
          className={cn(
            'flex h-8 w-[140px] items-center gap-1 rounded-md border bg-surface px-2 transition-colors duration-150',
            invalid ? 'border-danger/60' : 'border-primary/50',
          )}
        >
          <input
            ref={inputRef}
            value={draft}
            inputMode="decimal"
            aria-label={`Price in ${listing.currency}`}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${listing.id}-price-error` : undefined}
            onChange={(e) => {
              setDraft(e.target.value)
              setInvalid(false)
            }}
            onKeyDown={(e) => {
              // Never let a keystroke reach the row handler — see the note above.
              e.stopPropagation()
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            onBlur={() => {
              if (cancelled.current) {
                cancelled.current = false
                return
              }
              // A typo abandoned by clicking elsewhere is discarded, not saved.
              if (!commit()) {
                setEditing(false)
                setInvalid(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full min-w-0 bg-transparent text-body text-text tabular-nums outline-none"
          />
          <span className="shrink-0 text-caption text-faint">{listing.currency}</span>
        </div>
        {invalid && (
          <span id={`${listing.id}-price-error`} className="text-caption text-danger-ink">
            Enter a price above zero.
          </span>
        )}
      </div>
    )
  }

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        open()
      }}
      aria-label={`Edit price, currently ${display.originalText}`}
      className={cn(
        'group flex h-8 items-center gap-1.5 rounded-md border border-transparent px-2 text-body text-text transition-colors duration-150 hover:border-border hover:bg-surface-hover',
        className,
      )}
    >
      <span className="money tabular-nums">
        {display.converted ? '≈' : ''}
        {display.text}
      </span>
      <Pencil
        className="size-3 shrink-0 text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        aria-hidden="true"
      />
    </button>
  )

  if (!display.converted) return trigger

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent className="max-w-[260px] font-prose text-prose">
          Listed at {display.originalText}. Converted for display at {display.rateText}. Editing and
          saving happen in {listing.currency}.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * The read-only twin, for money columns that are not editable. Same conversion, same
 * tooltip, so a converted figure is never mistaken for the real one (§9 rule 7).
 */
export function NormalisedMoney({
  amount,
  currency,
  show,
  className,
}: {
  amount: number
  currency: Listing['currency']
  show: DisplayCurrency
  className?: string
}) {
  const { settings } = useLocale()
  const display = displayMoney({ amount, currency }, show, settings)

  const text = (
    <span className={cn('money tabular-nums', className)}>
      {display.converted ? '≈' : ''}
      {display.text}
    </span>
  )

  if (!display.converted) return text

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm">
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] font-prose text-prose">
          {display.originalText} converted at {display.rateText}.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
