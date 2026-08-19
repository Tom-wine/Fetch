import { convertMinor, minorUnitExponent, type Currency, type LocaleSettings } from './locale'

/**
 * THE number formatter (§9 rule 6). Nothing else in the app calls Intl.NumberFormat.
 *
 * Money is an integer of MINOR UNITS (pence) plus a currency code, never a float —
 * that is the API contract in §6.2, and floats lose pennies on the way through.
 */

export interface MoneyValue {
  /** Integer minor units. 4821000 is £48,210.00. */
  amount: number
  currency: Currency
}

const cache = new Map<string, Intl.NumberFormat>()

function formatter(key: string, build: () => Intl.NumberFormat): Intl.NumberFormat {
  let f = cache.get(key)
  if (!f) {
    f = build()
    cache.set(key, f)
  }
  return f
}

export interface FormatMoneyOptions {
  /** Drop the decimal part when the value is a whole unit. Used in dense tables. */
  compact?: boolean
  /** Force the sign, for deltas. */
  signDisplay?: Intl.NumberFormatOptions['signDisplay']
  /**
   * `£4.8M` instead of `£4,821,000`. Chart axes only — a value a user has to act on
   * is always shown in full.
   */
  notation?: Intl.NumberFormatOptions['notation']
}

/**
 * Formats minor units in the row's own currency.
 * Use `normalise()` first if the column can hold mixed currencies.
 */
export function formatMoney(
  value: MoneyValue,
  settings: LocaleSettings,
  options: FormatMoneyOptions = {},
): string {
  const exp = minorUnitExponent(value.currency)
  const major = value.amount / 10 ** exp
  const whole = value.amount % 10 ** exp === 0

  const short = options.notation === 'compact'
  const key = `${settings.locale}|${value.currency}|${options.compact && whole}|${options.signDisplay ?? ''}|${options.notation ?? ''}`
  return formatter(
    key,
    () =>
      new Intl.NumberFormat(settings.locale, {
        style: 'currency',
        currency: value.currency,
        notation: options.notation,
        ...(short
          ? { maximumFractionDigits: 1 }
          : {
              minimumFractionDigits: options.compact && whole ? 0 : exp,
              maximumFractionDigits: options.compact && whole ? 0 : exp,
            }),
        signDisplay: options.signDisplay,
      }),
  ).format(major)
}

/**
 * Applies the display-currency normaliser. Returns the value to render plus whether
 * a conversion happened, so the UI can mark it `≈` rather than implying an exact figure.
 */
export function normalise(
  value: MoneyValue,
  settings: LocaleSettings,
): { value: MoneyValue; converted: boolean } {
  const target = settings.displayCurrency
  if (!target || target === value.currency) return { value, converted: false }
  return {
    value: { amount: convertMinor(value.amount, value.currency, target), currency: target },
    converted: true,
  }
}

/** Plain integers — loyalty points, ticket counts, row totals. */
export function formatNumber(
  value: number,
  settings: LocaleSettings,
  options: Intl.NumberFormatOptions = {},
): string {
  const key = `n|${settings.locale}|${JSON.stringify(options)}`
  return formatter(key, () => new Intl.NumberFormat(settings.locale, options)).format(value)
}

/** Percentages for delta chips. `0.124` renders as `12.4%`. */
export function formatPercent(value: number, settings: LocaleSettings): string {
  return formatNumber(value, settings, {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  })
}

/* ------------------------------------------------------- input conversion */

/**
 * Money in, money out — the two halves of an editable price field.
 *
 * They live beside `formatMoney` rather than on a screen because three screens now
 * edit money: /mylistings edits a listing price inline and in bulk, and the seat
 * table's Edit dialog edits a ticket price. Parsing what an operator types is exactly
 * the kind of thing that must have one answer.
 */

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
