/**
 * Card helpers for the registration form.
 *
 * The single rule these encode: the full number is a transient thing the operator
 * types, and only its LAST FOUR ever leave the field. `toCardPayload` is the funnel —
 * everything the form submits about a card goes through it, and it cannot emit a PAN
 * or a CVV because it never takes one.
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown'

/** Brand from the leading digits, the same check a real form runs as you type. */
export function brandOf(number: string): CardBrand {
  const digits = number.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^6(?:011|5)/.test(digits)) return 'discover'
  return 'unknown'
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  unknown: 'Card',
}

/** The last four, and only the last four. */
export function last4Of(number: string): string {
  return number.replace(/\D/g, '').slice(-4)
}

/**
 * The shape the form holds per card. `number` lives ONLY in browser memory for the
 * length of the edit; `toCardPayload` reduces it to `last4` and it is never submitted.
 */
export interface CardFormValue {
  label: string
  cardholder: string
  /** Transient. Reduced to last4 on submit; never persisted, never transmitted. */
  number: string
  expMonth: string
  expYear: string
  billingSameAsMember: boolean
}

export function emptyCard(): CardFormValue {
  return {
    label: '',
    cardholder: '',
    number: '',
    expMonth: '',
    expYear: '',
    billingSameAsMember: true,
  }
}

export interface CardPayload {
  label: string
  brand?: string
  last4: string
  expMonth: number
  expYear: number
  cardholder?: string
  billingSameAsMember?: boolean
}

/**
 * Turn a filled card row into the tokenized payload. Returns null for an empty row so
 * a half-typed card does not become a submission. The full number is read here to
 * compute `last4` and `brand`, then discarded — it is never a property of the result.
 */
export function toCardPayload(card: CardFormValue): CardPayload | null {
  const last4 = last4Of(card.number)
  const hasAnything =
    card.label.trim() || last4 || card.cardholder.trim() || card.expMonth || card.expYear
  if (!hasAnything) return null

  return {
    label: card.label.trim() || `${BRAND_LABEL[brandOf(card.number)]} ••${last4}`,
    brand: brandOf(card.number),
    last4,
    expMonth: Number(card.expMonth) || 1,
    expYear: normalizeYear(card.expYear),
    cardholder: card.cardholder.trim() || undefined,
    billingSameAsMember: card.billingSameAsMember,
  }
}

/** Accepts "27" or "2027"; a real form should not care which the operator typed. */
function normalizeYear(value: string): number {
  const n = Number(value)
  if (!n) return new Date().getFullYear()
  return n < 100 ? 2000 + n : n
}
