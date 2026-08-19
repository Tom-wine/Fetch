'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { useLocale } from '@/lib/format/LocaleProvider'
import { convertMinor, type Currency } from '@/lib/format/locale'
import { formatMoney } from '@/lib/format/money'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { SectionLabel } from '@/components/ui/typography'
import type { Listing } from '@/lib/types'
import { ORIGINAL, toMajorInput, toMinor, type DisplayCurrency } from './currency'

/**
 * §8.6's reprice dialog: `set to` / `adjust by ±%` / `adjust by ±amount`, with a
 * preview of the resulting prices.
 *
 * The preview is the point. A percentage against a mixed set produces a different
 * number for every listing, and "−10% on 12 listings" is not something an operator
 * can hold in their head — so the dialog shows the arithmetic it is about to commit,
 * every row of it, before the button is live.
 *
 * Currency: absolute figures (`set to`, `adjust by amount`) are entered in ONE
 * currency, named beside the field, and converted into each listing's own currency
 * on the way out — the same static rates the normaliser uses. A percentage needs no
 * conversion at all, which is why it is the mode that is always exact.
 */

export type RepriceMode = 'set' | 'percent' | 'amount'

const MODES: Array<{ id: RepriceMode; label: string }> = [
  { id: 'set', label: 'Set to' },
  { id: 'percent', label: 'Adjust by %' },
  { id: 'amount', label: 'Adjust by amount' },
]

/** The smallest price the API will accept — `minorUnits.positive()` in schemas.ts. */
const MIN_PRICE = 1

export interface RepriceChange {
  listing: Listing
  from: number
  to: number
}

export function RepriceDialog({
  open,
  onOpenChange,
  listings,
  show,
  onConfirm,
  busy = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listings: Listing[]
  /** The screen's normaliser — the dialog reads in the same unit as the table. */
  show: DisplayCurrency
  onConfirm: (changes: RepriceChange[]) => void
  busy?: boolean
}) {
  const { settings } = useLocale()

  const [mode, setMode] = React.useState<RepriceMode>('percent')
  const [sign, setSign] = React.useState<1 | -1>(-1)
  const [raw, setRaw] = React.useState('10')

  /**
   * The currency an absolute figure is entered in. The normaliser wins when it names
   * a real currency, so the number typed here is in the same unit as the column the
   * operator was just reading; on `Original` it falls back to the set's own currency
   * when they all agree, and to the app's display currency when they do not.
   */
  const currencies = React.useMemo(() => [...new Set(listings.map((l) => l.currency))], [listings])
  const inputCurrency: Currency =
    show !== ORIGINAL
      ? show
      : currencies.length === 1
        ? currencies[0]!
        : (settings.displayCurrency ?? 'GBP')

  const mixed = currencies.length > 1

  // Reopening on a different selection should not inherit the last preview.
  React.useEffect(() => {
    if (open) return
    setMode('percent')
    setSign(-1)
    setRaw('10')
  }, [open])

  const value = mode === 'percent' ? readPercent(raw) : toMinor(raw, inputCurrency)
  const valid = value !== null && value > 0

  const changes = React.useMemo<RepriceChange[]>(() => {
    if (!valid) return []
    return listings
      .map((listing) => ({
        listing,
        from: listing.price,
        to: resultingPrice(listing, mode, value, sign, inputCurrency),
      }))
      .filter((change) => change.to !== change.from)
  }, [listings, mode, value, sign, inputCurrency, valid])

  const unchanged = listings.length - changes.length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[560px] rounded-xl border-border bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-title font-semibold uppercase">
            {`Reprice ${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}`}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-prose text-prose text-muted">
            {mixed
              ? `These listings are priced in ${currencies.join(' and ')}. An amount is entered in ${inputCurrency} and converted into each listing's own currency; a percentage applies to each price as it stands.`
              : 'The new prices are previewed below. Nothing is sent until you confirm.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={mode === option.id}
                onClick={() => {
                  setMode(option.id)
                  setRaw(
                    option.id === 'percent'
                      ? '10'
                      : toMajorInput(listings[0]?.price ?? 0, inputCurrency),
                  )
                }}
                className={cn(
                  'h-8 rounded-md border px-3 font-mono text-btn font-semibold transition-colors duration-150',
                  mode === option.id
                    ? 'border-primary/40 bg-primary/12 text-primary-ink'
                    : 'border-border bg-surface text-muted hover:bg-surface-hover hover:text-text',
                )}
              >
                {upperSnake(option.label)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode !== 'set' && (
              <div className="flex overflow-hidden rounded-md border border-border">
                {([1, -1] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={sign === s}
                    aria-label={s === 1 ? 'Increase' : 'Decrease'}
                    onClick={() => setSign(s)}
                    className={cn(
                      'size-8 font-mono text-body font-semibold transition-colors duration-150',
                      sign === s
                        ? 'bg-primary/12 text-primary-ink'
                        : 'text-muted hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    {s === 1 ? '+' : '−'}
                  </button>
                ))}
              </div>
            )}

            <div className="flex h-9 w-[160px] items-center gap-1 rounded-md border border-border bg-surface px-2">
              <Input
                autoFocus
                value={raw}
                inputMode="decimal"
                aria-label={mode === 'percent' ? 'Percentage' : `Amount in ${inputCurrency}`}
                onChange={(e) => setRaw(e.target.value)}
                className="h-7 border-0 bg-transparent px-0 text-body tabular-nums shadow-none focus-visible:ring-0"
              />
              <span className="shrink-0 text-caption text-faint">
                {mode === 'percent' ? '%' : inputCurrency}
              </span>
            </div>

            {!valid && raw.trim() !== '' && (
              <span className="text-caption text-danger-ink">Enter a number above zero.</span>
            )}
          </div>

          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
              <SectionLabel>preview</SectionLabel>
              <span className="text-caption text-faint tabular-nums">
                {changes.length} of {listings.length}
              </span>
            </div>

            {changes.length === 0 ? (
              <p className="px-3 pb-3 font-prose text-prose text-muted">
                {valid
                  ? 'Nothing would change. Every selected listing already sits at that price.'
                  : 'Enter an amount to see the resulting prices.'}
              </p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto">
                {changes.map(({ listing, from, to }) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-3 border-t border-border px-3 py-1.5 first:border-t-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-text">
                        {listing.fixtureName}
                      </span>
                      <span className="block truncate text-caption text-faint">
                        {listing.block}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption text-faint tabular-nums line-through">
                      {formatMoney({ amount: from, currency: listing.currency }, settings)}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-body font-semibold tabular-nums',
                        to > from ? 'text-success-ink' : 'text-danger-ink',
                      )}
                    >
                      {formatMoney({ amount: to, currency: listing.currency }, settings)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {unchanged > 0 && changes.length > 0 && (
              <p className="border-t border-border px-3 py-2 font-prose text-prose text-muted">
                {unchanged} {unchanged === 1 ? 'listing is' : 'listings are'} already at that price
                and will be left alone.
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="mt-0">CANCEL</AlertDialogCancel>
          <AlertDialogAction
            disabled={changes.length === 0 || busy}
            onClick={() => onConfirm(changes)}
          >
            {`REPRICE (${changes.length})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * One listing's resulting price, in ITS OWN currency and minor units. Never allowed
 * below one minor unit — `listingPatchSchema` requires a positive price, so a −120%
 * adjustment has to land somewhere real rather than being rejected row by row.
 */
function resultingPrice(
  listing: Listing,
  mode: RepriceMode,
  value: number,
  sign: 1 | -1,
  inputCurrency: Currency,
): number {
  if (mode === 'percent') {
    return Math.max(MIN_PRICE, Math.round(listing.price * (1 + (sign * value) / 100)))
  }

  const inOwn = convertMinor(value, inputCurrency, listing.currency)
  if (mode === 'set') return Math.max(MIN_PRICE, inOwn)
  return Math.max(MIN_PRICE, listing.price + sign * inOwn)
}

function readPercent(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.').replace('%', ''))
  return Number.isFinite(value) ? value : null
}
