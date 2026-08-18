/**
 * The single locale setting for the whole app (§9 rule 6).
 *
 * One locale, one timezone, one display currency — every date and every number in
 * Fetch.io is formatted from this. `/settings → Preferences` writes it; nothing
 * else does, and no component formats anything itself.
 */
export interface LocaleSettings {
  /** BCP-47 tag, e.g. `en-GB`. */
  locale: string
  /** IANA zone, e.g. `Europe/London`. */
  timeZone: string
  /** ISO-4217 code the UI displays in. `null` means "show each row's own currency". */
  displayCurrency: Currency | null
}

export type Currency = 'GBP' | 'EUR' | 'USD'

export const DEFAULT_LOCALE: LocaleSettings = {
  locale: 'en-GB',
  timeZone: 'Europe/London',
  displayCurrency: 'GBP',
}

export const LOCALE_OPTIONS = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
] as const

export const TIMEZONE_OPTIONS = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'UTC',
] as const

export const CURRENCY_OPTIONS: Currency[] = ['GBP', 'EUR', 'USD']

/**
 * Minor units per currency. Every one Fetch.io handles is two-decimal, but the
 * lookup exists so a zero-decimal currency (JPY) cannot silently be divided by 100.
 */
const MINOR_UNIT_EXPONENT: Record<Currency, number> = {
  GBP: 2,
  EUR: 2,
  USD: 2,
}

export function minorUnitExponent(currency: Currency): number {
  return MINOR_UNIT_EXPONENT[currency] ?? 2
}

/**
 * Indicative rates, used only by the display-currency normaliser (§9 rule 7) so a
 * mixed-currency column can be read in one unit. Part 3 replaces this with rates
 * from the API; the UI never invents a rate silently — `Money` marks a converted
 * value with a `≈`.
 */
const RATES_TO_GBP: Record<Currency, number> = {
  GBP: 1,
  EUR: 0.85,
  USD: 0.79,
}

/** Converts integer minor units between currencies, staying in minor units. */
export function convertMinor(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount
  const inGbp = amount * RATES_TO_GBP[from]
  return Math.round(inGbp / RATES_TO_GBP[to])
}
