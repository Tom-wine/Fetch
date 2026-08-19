import {
  convertMinor,
  minorUnitExponent,
  type Currency,
  type LocaleSettings,
} from '@/lib/format/locale'
import { formatMoney, type MoneyValue } from '@/lib/format/money'

/**
 * The §8.6 currency normaliser — `Show in: GBP ▾`, with `Original` (§9 rule 7).
 *
 * PRICE is the one column in the app that genuinely holds mixed currencies: a
 * Ticombo listing against a European fixture is priced in EUR while everything else
 * is GBP, and a column an operator scans for "what is this worth" is unreadable in
 * two units. So the screen converts for DISPLAY and says so — `≈` in the cell, the
 * untouched original and the rate used in the tooltip.
 *
 * The rates come from the static table in `lib/format/locale.ts`, which is the same
 * one the app-wide display-currency setting uses. Nothing here invents a rate, and
 * nothing here ever writes a converted number back: an edit and a reprice are
 * committed in the listing's own currency (see `toMinor`), because a value that has
 * been through an indicative rate twice is not the price anyone agreed to.
 */

export const ORIGINAL = 'original'

/** A real currency to normalise into, or `original` for "each row in its own". */
export type DisplayCurrency = Currency | typeof ORIGINAL

export const DISPLAY_OPTIONS: Array<{ value: DisplayCurrency; label: string; hint: string }> = [
  { value: 'GBP', label: 'GBP', hint: 'Pound sterling' },
  { value: 'EUR', label: 'EUR', hint: 'Euro' },
  { value: 'USD', label: 'USD', hint: 'US dollar' },
  { value: ORIGINAL, label: 'Original', hint: 'Each listing in the currency it was priced in' },
]

const REAL_CURRENCIES = new Set<string>(['GBP', 'EUR', 'USD'])

export function isDisplayCurrency(raw: string | null): raw is DisplayCurrency {
  return raw === ORIGINAL || (raw !== null && REAL_CURRENCIES.has(raw))
}

export interface DisplayedMoney {
  /** What the cell renders, already formatted. */
  text: string
  /** True when a rate was applied — the cell marks it `≈`, never silently. */
  converted: boolean
  /** The untouched figure, for the tooltip. */
  originalText: string
  /** `1 EUR = 0.85 GBP`, or null when nothing was converted. */
  rateText: string | null
}

/**
 * Formats one money value under the screen's normaliser. Everything the cell and the
 * card need to be honest about the conversion comes back in one object, so the two
 * surfaces cannot describe the same number differently.
 */
export function displayMoney(
  value: MoneyValue,
  show: DisplayCurrency,
  settings: LocaleSettings,
): DisplayedMoney {
  const originalText = formatMoney(value, settings)

  if (show === ORIGINAL || show === value.currency) {
    return { text: originalText, converted: false, originalText, rateText: null }
  }

  const converted: MoneyValue = {
    amount: convertMinor(value.amount, value.currency, show),
    currency: show,
  }

  return {
    text: formatMoney(converted, settings),
    converted: true,
    originalText,
    rateText: rateBetween(value.currency, show),
  }
}

/**
 * The rate actually applied, read back out of `convertMinor` rather than restated —
 * a rate quoted in a tooltip that does not match the arithmetic is worse than none.
 */
function rateBetween(from: Currency, to: Currency): string {
  const one = 10 ** minorUnitExponent(from)
  const rate = convertMinor(one, from, to) / 10 ** minorUnitExponent(to)
  return `1 ${from} = ${rate.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} ${to}`
}

/* ------------------------------------------------------- input conversion */

/**
 * Minor units → the plain string an <input> holds. Deliberately NOT locale-formatted:
 * a grouped, symbol-prefixed value is a nuisance to edit, and the field has the
 * currency code beside it so there is nothing to infer.
 */
export function toMajorInput(amount: number, currency: Currency): string {
  const exp = minorUnitExponent(currency)
  return (amount / 10 ** exp).toFixed(exp)
}

/**
 * The inverse, tolerant of what an operator actually types: `48.50`, `£48.50`,
 * `1,234.56`, `1.234,56`, `48`. Returns null for anything that is not a number, so
 * the caller can refuse the commit rather than PATCHing a NaN.
 */
export function toMinor(raw: string, currency: Currency): number | null {
  const cleaned = raw.trim().replace(/[^\d.,-]/g, '')
  if (!cleaned || !/\d/.test(cleaned)) return null

  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')

  let decimalAt = -1
  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the rightmost is the decimal separator, the other groups.
    decimalAt = Math.max(lastDot, lastComma)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const at = Math.max(lastDot, lastComma)
    const trailing = cleaned.length - at - 1
    const only = cleaned.indexOf(cleaned[at]!) === at
    // `1,234` is a thousand, `12,34` is twelve and a bit. One separator with one or
    // two digits behind it is a decimal point; anything else is grouping.
    if (only && trailing > 0 && trailing <= 2) decimalAt = at
  }

  const whole = (decimalAt >= 0 ? cleaned.slice(0, decimalAt) : cleaned).replace(/[.,]/g, '')
  const fraction = decimalAt >= 0 ? cleaned.slice(decimalAt + 1).replace(/[.,]/g, '') : ''

  const value = Number(`${whole || '0'}.${fraction || '0'}`)
  if (!Number.isFinite(value)) return null

  return Math.round(value * 10 ** minorUnitExponent(currency))
}

/**
 * Does the PRICE column look unsorted?
 *
 * `GET /listings` orders by each listing's price in ITS OWN currency, because that is
 * the only number the server holds. Under a normaliser the cells show converted
 * figures, and the two orders do not agree: EUR 32530 sorts above GBP 30920, but
 * once both are shown in pounds the euro row displays as the smaller of the two.
 *
 * So rather than assert the caveat all the time, look at what is actually on screen
 * and only say something when the visible sequence really does break. Ties are
 * skipped — equal neighbours are not evidence either way.
 */
export function priceOrderLooksBroken(
  rows: Array<{ price: number; currency: Currency }>,
  show: DisplayCurrency,
  desc: boolean,
): boolean {
  if (show === ORIGINAL || rows.length < 2) return false

  const shown = rows.map((r) =>
    r.currency === show ? r.price : convertMinor(r.price, r.currency, show),
  )

  for (let i = 1; i < shown.length; i++) {
    const previous = shown[i - 1]!
    const current = shown[i]!
    if (previous === current) continue
    if (desc ? current > previous : current < previous) return true
  }

  return false
}
