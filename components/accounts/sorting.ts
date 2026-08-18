import type { SortSpec } from '@/components/data/DataTable'

/**
 * The bridge between three vocabularies that are deliberately not the same word.
 *
 *   column id   `account`        — what DataTable emits on a header click
 *   API field   `email`          — what `?sort=` takes
 *   label       `Account`        — what the operator reads
 *
 * Keeping them in one table means a column can never claim to sort by something the
 * endpoint cannot order by, and the under-`md` Sort control offers exactly the set
 * the headers offer, rather than a second list that drifts.
 *
 * Lives in its own module so `url-state.ts` can read it without importing a file
 * full of React components.
 */
export interface SortableColumn {
  /** `columnDef.id` — the id DataTable reports. */
  column: string
  /** The `?sort=` value. Must be a real field on the Account resource. */
  field: string
  /** Chrome label for the under-`md` control. */
  label: string
}

export const SORTABLE_COLUMNS: SortableColumn[] = [
  { column: 'account', field: 'email', label: 'Account' },
  // Sorts by club id, so Spurs files under `tottenham`. Every other club's id and
  // short name agree, and grouping by club is worth the one exception.
  { column: 'club', field: 'club', label: 'Club' },
  { column: 'membership', field: 'membershipType', label: 'Membership' },
  { column: 'loyalty', field: 'loyaltyPoints', label: 'Loyalty' },
  { column: 'tickets', field: 'ticketsPurchased', label: 'Tickets' },
  { column: 'status', field: 'status', label: 'Status' },
  { column: 'lastCheck', field: 'lastCheckedAt', label: 'Last check' },
]

/**
 * What `GET /accounts` orders by when no `sort` is supplied (`defaultSort` in
 * lib/mock/http.ts). The third click of the asc → desc → none cycle clears the
 * parameter, and the rows come back in this order — so this is what the headers
 * show at that point, rather than a neutral icon over data that is plainly sorted.
 */
export const DEFAULT_SORT_FIELD = 'email'

const BY_COLUMN = new Map(SORTABLE_COLUMNS.map((c) => [c.column, c]))
const BY_FIELD = new Map(SORTABLE_COLUMNS.map((c) => [c.field, c]))

export function sortFieldForColumn(columnId: string): string | null {
  return BY_COLUMN.get(columnId)?.field ?? null
}

/**
 * Normalises whatever is in the URL. An unknown `?sort=` — a hand-edited link, or a
 * field the API dropped — resolves to `null` rather than being forwarded, so the URL,
 * the request and the highlighted header can never disagree.
 */
export function normaliseSortField(raw: string | null): string | null {
  return raw && BY_FIELD.has(raw) ? raw : null
}

/** The active sort in DataTable's terms. `null` only for a field with no column. */
export function sortSpecFor(field: string | null, order: 'asc' | 'desc'): SortSpec | null {
  const entry = BY_FIELD.get(field ?? DEFAULT_SORT_FIELD)
  if (!entry) return null
  return { id: entry.column, desc: field === null ? false : order === 'desc' }
}
