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
