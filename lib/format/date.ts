import type { LocaleSettings } from './locale'

/**
 * THE date formatter (§9 rule 6). Nothing else in the app calls Intl.DateTimeFormat
 * or date-fns directly.
 *
 * The API hands us ISO-8601 UTC strings and never formats (§6.2); everything here
 * renders them in the user's single configured locale and timezone.
 */

const cache = new Map<string, Intl.DateTimeFormat>()

function fmt(key: string, build: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  let f = cache.get(key)
  if (!f) {
    f = build()
    cache.set(key, f)
  }
  return f
}

function toDate(iso: string | Date): Date {
  return iso instanceof Date ? iso : new Date(iso)
}

/** `14/09/2026` in en-GB. */
export function formatDate(iso: string | Date, s: LocaleSettings): string {
  return fmt(
    `d|${s.locale}|${s.timeZone}`,
    () =>
      new Intl.DateTimeFormat(s.locale, {
        timeZone: s.timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
  ).format(toDate(iso))
}

/** `14/09/2026, 15:00` — the kickoff format used across every fixture table. */
export function formatDateTime(iso: string | Date, s: LocaleSettings): string {
  return fmt(
    `dt|${s.locale}|${s.timeZone}`,
    () =>
      new Intl.DateTimeFormat(s.locale, {
        timeZone: s.timeZone,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
  ).format(toDate(iso))
}

/** `14 Sep 2026` — for breadcrumbs and fixture headers, where digits crowd. */
export function formatDateLong(iso: string | Date, s: LocaleSettings): string {
  return fmt(
    `dl|${s.locale}|${s.timeZone}`,
    () =>
      new Intl.DateTimeFormat(s.locale, {
        timeZone: s.timeZone,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  ).format(toDate(iso))
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * `in 3 days` / `2h ago`. Returns the parts as well as the string so callers can
 * colour by urgency without re-deriving the delta.
 */
export function formatRelative(
  iso: string | Date,
  s: LocaleSettings,
  now: Date = new Date(),
): { text: string; deltaMs: number; future: boolean; daysAway: number } {
  const date = toDate(iso)
  const deltaMs = date.getTime() - now.getTime()
  const future = deltaMs > 0
  const abs = Math.abs(deltaMs)
  const daysAway = deltaMs / DAY

  const rtf = relative(s.locale)

  let text: string
  if (abs < MINUTE) {
    text = 'just now'
  } else if (abs < HOUR) {
    text = rtf.format(Math.round(deltaMs / MINUTE), 'minute')
  } else if (abs < DAY) {
    text = rtf.format(Math.round(deltaMs / HOUR), 'hour')
  } else if (abs < 7 * DAY) {
    text = rtf.format(Math.round(deltaMs / DAY), 'day')
  } else if (abs < 30 * DAY) {
    text = rtf.format(Math.round(deltaMs / (7 * DAY)), 'week')
  } else {
    text = rtf.format(Math.round(deltaMs / (30 * DAY)), 'month')
  }

  return { text, deltaMs, future, daysAway }
}

const rtfCache = new Map<string, Intl.RelativeTimeFormat>()

function relative(locale: string): Intl.RelativeTimeFormat {
  let r = rtfCache.get(locale)
  if (!r) {
    r = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
    rtfCache.set(locale, r)
  }
  return r
}

/**
 * The §8.4 urgency ramp. A fixture inside 7 days is the thing the operator is
 * anxious about, so it reads danger; inside 30 days, warning.
 */
export type Urgency = 'past' | 'urgent' | 'soon' | 'later'

export function urgencyOf(daysAway: number): Urgency {
  if (daysAway < 0) return 'past'
  if (daysAway <= 7) return 'urgent'
  if (daysAway <= 30) return 'soon'
  return 'later'
}
