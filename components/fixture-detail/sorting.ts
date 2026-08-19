/**
 * The one sort registry for the seat table (§8.5).
 *
 * A sort has two names: the column id a header click emits (`face`) and the field the
 * API orders by (`faceValue`). Keeping both here means the headers, the small-screen
 * `Sort` control and the URL cannot drift into disagreeing about what "sorted by
 * face" means — and a field the API cannot order HONESTLY simply never appears, so no
 * header can offer it.
 *
 * Two columns are deliberately absent:
 *
 * - `ROW` and `SEAT` are numeric strings in the data model, and the API compares
 *   strings with `localeCompare`. Ordering by them would put row 10 above row 2 and
 *   present it as sorted. Sorting the loaded page client-side instead would be worse:
 *   it would order 25 seats of 90 and look like it had ordered all of them.
 * - `ACCOUNT` orders by `accountId`, an opaque string, while the cell shows an email
 *   resolved from a different query. The rows would reorder in a way the column does
 *   not explain.
 */
export interface TicketSort {
  /** What the API sorts by. */
  field: string
  /** The DataTable column id that header clicks emit. */
  columnId: string
  /** Chrome label for the small-screen control, written normally. */
  label: string
}

export const TICKET_SORTS: TicketSort[] = [
  { field: 'block', columnId: 'block', label: 'Block' },
  { field: 'levelName', columnId: 'level', label: 'Level' },
  { field: 'price', columnId: 'price', label: 'Price' },
  { field: 'faceValue', columnId: 'face', label: 'Face' },
  { field: 'visibility', columnId: 'visibility', label: 'Visibility' },
  { field: 'status', columnId: 'status', label: 'Status' },
]

/** The endpoint's own default (`defaultSort: 'block'`), so an unsorted URL matches it. */
export const DEFAULT_SORT_FIELD = 'block'

const BY_FIELD = new Map(TICKET_SORTS.map((s) => [s.field, s]))
const BY_COLUMN = new Map(TICKET_SORTS.map((s) => [s.columnId, s]))

/** Column ids whose header may be clicked — everything else is plain header text. */
export const SORTABLE_COLUMN_IDS: ReadonlySet<string> = new Set(TICKET_SORTS.map((s) => s.columnId))

export function isSortField(value: string | null | undefined): boolean {
  return Boolean(value && BY_FIELD.has(value))
}

export function columnIdForField(field: string): string {
  return BY_COLUMN.get(field)?.columnId ?? BY_FIELD.get(field)?.columnId ?? DEFAULT_SORT_FIELD
}

export function fieldForColumnId(columnId: string): string {
  return BY_COLUMN.get(columnId)?.field ?? DEFAULT_SORT_FIELD
}
