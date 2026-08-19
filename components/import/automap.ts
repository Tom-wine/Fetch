import { FIELDS, IGNORE, type FieldId, type Mapped } from './fields'
import { confidenceOf, normalise, similarity, type Confidence } from './fuzzy'

/**
 * Step 2's pre-selection: every CSV header guessed onto a Fetch.io field, with the
 * score that produced the guess so the mapper can render §8.3's confidence dot.
 *
 * A guess is never silent. Green means "this is the same word"; amber means "this is
 * probably it, look at the sample values"; grey means the operator chose, or nothing
 * scored well enough to claim. Two headers can never be mapped to the same field —
 * the higher score keeps it and the loser drops to Ignore, because two columns
 * writing one field is a data-loss bug you only notice after the import.
 */

export interface ColumnMapping {
  /** Column index in the CSV, which is also its index in every parsed row. */
  index: number
  header: string
  field: Mapped
  /** null once a human has chosen — the dot goes grey and stops claiming a guess. */
  score: number | null
}

export type Mapping = ColumnMapping[]

export function confidenceFor(entry: ColumnMapping): Confidence {
  return entry.field === IGNORE ? 'manual' : confidenceOf(entry.score)
}

/** The score below which a guess is not worth making at all. */
const FLOOR = 0.6

function scoreHeaderAgainstField(header: string, field: (typeof FIELDS)[number]): number {
  const candidates = [field.header, field.label, ...field.aliases]
  let best = 0
  for (const candidate of candidates) {
    best = Math.max(best, normalise(candidate) === normalise(header) ? 1 : similarity(header, candidate))
    if (best === 1) break
  }
  return best
}

export function autoMap(headers: string[]): Mapping {
  // Every (column, field) pair scored once, then assigned best-first so the strongest
  // claim on a field wins regardless of column order.
  const pairs: Array<{ index: number; field: FieldId; score: number }> = []

  headers.forEach((header, index) => {
    for (const field of FIELDS) {
      const score = scoreHeaderAgainstField(header, field)
      if (score >= FLOOR) pairs.push({ index, field: field.id, score })
    }
  })

  pairs.sort((a, b) => b.score - a.score)

  const takenColumns = new Set<number>()
  const takenFields = new Set<FieldId>()
  const chosen = new Map<number, { field: FieldId; score: number }>()

  for (const pair of pairs) {
    if (takenColumns.has(pair.index) || takenFields.has(pair.field)) continue
    takenColumns.add(pair.index)
    takenFields.add(pair.field)
    chosen.set(pair.index, { field: pair.field, score: pair.score })
  }

  return headers.map((header, index) => {
    const hit = chosen.get(index)
    return {
      index,
      header,
      field: hit?.field ?? IGNORE,
      score: hit?.score ?? null,
    }
  })
}

/** Applies one operator choice, clearing any other column that held the same field. */
export function setMappedField(mapping: Mapping, index: number, field: Mapped): Mapping {
  return mapping.map((entry) => {
    if (entry.index === index) return { ...entry, field, score: null }
    if (field !== IGNORE && entry.field === field) return { ...entry, field: IGNORE, score: null }
    return entry
  })
}

/** The required fields with no column pointing at them — step 2's blocking banner. */
export function missingRequired(mapping: Mapping): FieldId[] {
  const mapped = new Set(mapping.map((entry) => entry.field))
  return FIELDS.filter((field) => field.required && !mapped.has(field.id)).map((field) => field.id)
}

/** Column index per field, for turning a positional row into a keyed one. */
export function columnIndexByField(mapping: Mapping): Partial<Record<FieldId, number>> {
  const out: Partial<Record<FieldId, number>> = {}
  for (const entry of mapping) {
    if (entry.field !== IGNORE) out[entry.field] = entry.index
  }
  return out
}
