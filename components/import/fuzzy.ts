/**
 * The one string-similarity implementation in the wizard.
 *
 * Both fuzzy problems in §8.3 — matching a CSV header to a Fetch.io field and
 * matching "Man Utd" to Manchester United — need the same thing: a 0…1 score that is
 * stable enough to hang a confidence dot and an auto-fix threshold on. Sørensen–Dice
 * over character bigrams is the right shape here: it is order-sensitive enough to
 * separate `first_name` from `last_name`, forgiving of the abbreviations operators
 * actually type, and it costs nothing at 5000 rows × 20 clubs.
 */

/** Lowercase, drop everything that is not a letter or a digit. */
export function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/** Lowercase, collapse separators to single spaces — for word-level comparisons. */
export function words(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function bigrams(value: string): string[] {
  if (value.length < 2) return value ? [value] : []
  const out: string[] = []
  for (let i = 0; i < value.length - 1; i++) out.push(value.slice(i, i + 2))
  return out
}

/** Sørensen–Dice over character bigrams. 1 is identical, 0 shares nothing. */
export function dice(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1

  const left = bigrams(a)
  const right = bigrams(b)
  if (left.length === 0 || right.length === 0) return 0

  const pool = new Map<string, number>()
  for (const gram of left) pool.set(gram, (pool.get(gram) ?? 0) + 1)

  let hits = 0
  for (const gram of right) {
    const count = pool.get(gram) ?? 0
    if (count > 0) {
      pool.set(gram, count - 1)
      hits++
    }
  }

  return (2 * hits) / (left.length + right.length)
}

/**
 * `dice` plus the two cheap signals it under-values on real spreadsheet headers:
 * one string containing the other ("email" in "primary email address"), and an
 * initialism ("mu" for "manchester united", "dob" for "date of birth").
 */
export function similarity(input: string, candidate: string): number {
  const a = normalise(input)
  const b = normalise(candidate)
  if (!a || !b) return 0
  if (a === b) return 1

  let score = dice(a, b)

  if (a.includes(b) || b.includes(a)) {
    // Containment is strong, but a two-letter needle inside a long haystack is not.
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length)
    score = Math.max(score, 0.6 + 0.3 * ratio)
  }

  const initials = words(candidate)
    .map((w) => w[0])
    .join('')
  if (initials.length > 1 && initials === a) score = Math.max(score, 0.88)

  return score
}

export interface Match<T> {
  value: T
  score: number
}

/** The best candidate by `score(candidate)`, or null when the pool is empty. */
export function bestMatch<T>(pool: T[], score: (candidate: T) => number): Match<T> | null {
  let best: Match<T> | null = null
  for (const value of pool) {
    const s = score(value)
    if (!best || s > best.score) best = { value, score: s }
  }
  return best
}

/* -------------------------------------------------------------- confidence */

export type Confidence = 'high' | 'medium' | 'manual'

/** §8.3's dot: green ≥ 0.9, amber ≥ 0.6, grey below — or whenever a human chose. */
export function confidenceOf(score: number | null): Confidence {
  if (score === null) return 'manual'
  if (score >= 0.9) return 'high'
  if (score >= 0.6) return 'medium'
  return 'manual'
}

/** The threshold "Fix all clubs automatically" will act on without asking. */
export const AUTO_FIX_THRESHOLD = 0.9
