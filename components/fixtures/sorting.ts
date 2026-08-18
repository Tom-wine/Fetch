/**
 * The one sort registry for /mytickets.
 *
 * A sort has two names: the column id the table clicks with (`total`) and the field
 * path the API orders by (`counts.total`). Keeping both in one table means the
 * headers, the toolbar control and the URL can never drift into disagreeing about
 * what "sorted by tickets" means — and a field that the API cannot sort by simply
 * never appears here, so no header can offer it.
 */
export interface FixtureSort {
  /** What the API sorts by — dotted paths allowed (§6.2 `?sort=counts.total`). */
  field: string
  /** The DataTable column id that header-clicks emit. */
  columnId: string
  /** Chrome label for the toolbar control, written normally. */
  label: string
}

export const FIXTURE_SORTS: FixtureSort[] = [
  { field: 'kickoff', columnId: 'kickoff', label: 'Kickoff' },
  { field: 'valueAtRisk', columnId: 'valueAtRisk', label: 'Value at risk' },
  { field: 'counts.total', columnId: 'total', label: 'Tickets' },
  { field: 'counts.listed', columnId: 'listed', label: 'Listed' },
  { field: 'counts.sold', columnId: 'sold', label: 'Sold' },
  { field: 'counts.transferred', columnId: 'transferred', label: 'Transferred' },
  { field: 'venue.name', columnId: 'venue', label: 'Venue' },
]

/** §8.4: kickoff ascending, so the fixture that is closest to being a loss is first. */
export const DEFAULT_SORT_FIELD = 'kickoff'

const BY_FIELD = new Map(FIXTURE_SORTS.map((s) => [s.field, s]))
const BY_COLUMN = new Map(FIXTURE_SORTS.map((s) => [s.columnId, s]))

/** Column ids whose header may be clicked — everything else renders as plain text. */
export const SORTABLE_COLUMN_IDS: ReadonlySet<string> = new Set(
  FIXTURE_SORTS.map((s) => s.columnId),
)

export function isSortField(value: string): boolean {
  return BY_FIELD.has(value)
}

export function columnIdForField(field: string): string {
  return BY_FIELD.get(field)?.columnId ?? DEFAULT_SORT_FIELD
}

export function fieldForColumnId(columnId: string): string {
  return BY_COLUMN.get(columnId)?.field ?? DEFAULT_SORT_FIELD
}
