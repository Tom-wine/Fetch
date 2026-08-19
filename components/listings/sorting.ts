/**
 * The one sort registry for /mylistings.
 *
 * A sort has three names that are deliberately not the same word:
 *
 *   column id   `fixture`        — what DataTable emits on a header click
 *   API field   `fixtureName`    — what `?sort=` takes
 *   label       `Fixture`        — what the operator reads
 *
 * Keeping them in one table means the headers, the under-`md` Sort control and the
 * URL can never drift, and — the rule that matters — a field the endpoint cannot
 * order by simply never appears here, so no header can offer a sort the server
 * cannot honour.
 *
 * Two of the eleven columns are absent on purpose:
 *
 *   ACCOUNT   `GET /listings` can only order by `accountId`, an opaque string, while
 *             the cell shows an email resolved from a separate query. The rows would
 *             reorder in a way the column does not explain.
 *   ⋮         holds no orderable value at all.
 */
export interface ListingSort {
  /** The `?sort=` value. Must be a real field on the Listing resource. */
  field: string
  /** `columnDef.id` — the id DataTable reports on a header click. */
  columnId: string
  /** Chrome label for the under-`md` control, written normally. */
  label: string
}

export const LISTING_SORTS: ListingSort[] = [
  { field: 'kickoff', columnId: 'kickoff', label: 'Kickoff' },
  { field: 'platform', columnId: 'platform', label: 'Platform' },
  { field: 'fixtureName', columnId: 'fixture', label: 'Fixture' },
  { field: 'listingId', columnId: 'listingId', label: 'Listing ID' },
  // Orders by the listing's OWN price, in its own currency — see currency.ts for why
  // the normaliser cannot change that without lying about what the server did.
  { field: 'price', columnId: 'price', label: 'Price' },
  { field: 'block', columnId: 'block', label: 'Block' },
  { field: 'rank', columnId: 'rank', label: 'Rank' },
  { field: 'quantity', columnId: 'qty', label: 'Quantity' },
  { field: 'status', columnId: 'status', label: 'Status' },
]

/** What `GET /listings` orders by with no `sort` (`defaultSort` in lib/mock/http.ts). */
export const DEFAULT_SORT_FIELD = 'kickoff'

const BY_FIELD = new Map(LISTING_SORTS.map((s) => [s.field, s]))
const BY_COLUMN = new Map(LISTING_SORTS.map((s) => [s.columnId, s]))

/** Column ids whose header may be clicked. Stamped onto `meta.sortable`. */
export const SORTABLE_COLUMN_IDS: ReadonlySet<string> = new Set(
  LISTING_SORTS.map((s) => s.columnId),
)

/**
 * Normalises whatever is in the URL. An unknown `?sort=` — a hand-edited link, or a
 * field the API dropped — resolves to the default rather than being forwarded, so
 * the URL, the request and the lit header can never disagree.
 */
export function normaliseSortField(raw: string | null): string {
  return raw && BY_FIELD.has(raw) ? raw : DEFAULT_SORT_FIELD
}

export function columnIdForField(field: string): string {
  return BY_FIELD.get(field)?.columnId ?? 'kickoff'
}

export function fieldForColumnId(columnId: string): string {
  return BY_COLUMN.get(columnId)?.field ?? DEFAULT_SORT_FIELD
}
