/**
 * A tiny deterministic PRNG (mulberry32).
 *
 * The seed is fixed and every value is drawn at module-load time, so the dataset is
 * identical on every boot and a screenshot only changes when a component changes.
 * `Math.random()` is never called at request time (§5).
 */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    /** Integer in [min, max]. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** One element of `items`. */
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)]!,
    /** `true` with probability `p`. */
    chance: (p: number) => next() < p,
    /** A shuffled copy — Fisher–Yates, so the order is stable for a given seed. */
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j]!, out[i]!]
      }
      return out
    },
  }
}

/**
 * The clock anchor. Every seeded timestamp is an offset from server start, so a
 * `lastCheckedAt` can never drift into the future and a kickoff "in 3 days" stays
 * three days away however long the process has been running.
 */
export const SEED_NOW = Date.now()

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

/** ISO string `ms` in the past. */
export const ago = (ms: number) => new Date(SEED_NOW - ms).toISOString()

/** ISO string `ms` in the future. */
export const ahead = (ms: number) => new Date(SEED_NOW + ms).toISOString()
