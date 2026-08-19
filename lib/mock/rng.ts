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
 * The seed every stream is derived from. One number, so the whole dataset is one
 * decision.
 */
const BASE_SEED = 0x5e7c4

/**
 * A PRNG stream of its own, keyed by name.
 *
 * Every builder in seed.ts used to draw from ONE shared sequence, which made the data
 * depend on the order the builders happened to run in. Deleting `buildListings()` in
 * Part 12 shortened that sequence and silently moved every figure downstream of it —
 * the dashboard's totals changed because a builder three sections away was removed.
 *
 * Keying the stream by name makes the seed edit-order-independent: add, remove or
 * reorder a builder and every OTHER builder's output is byte-identical, because its
 * stream never saw the change. The name is hashed with FNV-1a and mixed into the base
 * seed, so `rngFor('runs')` is stable across processes and `rngFor('tasks')` is
 * uncorrelated with it.
 */
export function rngFor(name: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return rng((BASE_SEED ^ h) >>> 0)
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
