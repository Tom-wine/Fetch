# Fetch.io — backend handoff

What a real backend has to know that the contract alone does not say. The wire format
is in [`API-CONTRACT.md`](./API-CONTRACT.md); this file is the list of things the
frontend cannot do for you.

---

## Passwords

The frontend never persists a club password. It exists in memory during an import and
is POSTed once. `passwordMasked` is the only form that appears in any list response.

`POST /accounts/:id/reveal` is the single endpoint that returns plaintext. It must be
a POST, it must be audit-logged with the account id and the caller — **never the
secret** — and it must respond `Cache-Control: no-store`. The UI re-masks after ten
seconds and never writes the value into the query cache, but that is a courtesy, not
a control: **the real requirement is encryption at rest on your side.**

---

## Sorting in a normalised currency — a backend capability, not a UI one

`GET /listings?sort=price` orders by each listing's price **in its own currency**,
because that integer is the only price the server holds.

`/mylistings` has a currency normaliser: pick GBP and every row is shown converted.
The two do not agree. A €325.30 listing sorts above a £309.20 one — `32530 > 30920` —
but displayed in pounds the euro row is the smaller number, so the column looks
unsorted.

**The UI cannot fix this.** Re-sorting the loaded page client-side would be worse than
the current behaviour, not better: the page holds 25 of 26 rows chosen by the
*server's* order, so re-ordering them locally produces a page that is internally tidy
and globally wrong — the row that should be first may not be on it at all. The frontend
therefore keeps the header honest and, when the visible rows actually break monotonic
order, annotates the header with *"sorted by native currency"* rather than pretending.

To make normalised sorting real, the backend needs one of:

1. **Store a normalised amount.** Persist each listing's price in a single base
   currency alongside its native one, refreshed when the rate moves, and accept
   `?sort=priceBase`. Simplest and fastest; the rate is then a property of the record,
   with all the staleness questions that implies.
2. **Sort by a rate-converted expression at query time.** `ORDER BY price * rate(currency, :display)`
   with `:display` passed as a parameter. Correct at read time, and needs the rate
   table joinable and indexed or it will not scale.
3. **Accept a `displayCurrency` parameter** on `GET /listings` and let the server
   decide how it satisfies it. Best for the frontend — it just forwards the
   normaliser — and leaves you free to change strategy later.

If you implement any of them, the frontend change is small: send the display currency
with the query and drop the header note.

The exchange rates in `lib/format/locale.ts` are indicative constants for the mock.
Replace them with real rates from the API; the UI already marks every converted figure
with `≈` and carries the original in a tooltip, so it is ready for rates it did not
invent.

---

## Money and dates

Money is an **integer of minor units** plus a currency code, everywhere, in every
direction. Never a float, never a formatted string. `24500` + `"GBP"` is £245.00.

Dates are ISO-8601 UTC strings. The server never formats one. The client owns locale
and timezone entirely — one date formatter, driven by the user's Preferences setting.

---

## Pagination and sorting are server-side

`DataTable` runs in manual mode on every screen: it does not slice, and it does not
reorder. It renders the page you return, in the order you return it, and reports the
`meta` you send.

That means `meta.total` and `meta.totalPages` are load-bearing — they are what the
footer and the pager show. A response with a correct `data` array and a wrong `meta`
produces a table that looks right and pages wrong.

Repeated query keys mean OR (`?club=arsenal&club=chelsea`); different keys are ANDed.

---

## Bulk selection

The header checkbox selects **the current page only**, and the UI says so. Where a
screen offers "select all N matching these filters", it fetches the full matching set
first so the number in the label is the number that gets acted on.

If your bulk endpoints ever grow a "match these filters" form instead of an id list,
say so — the screens would rather send the filter than 500 ids.

---

## Failure injection is mock-only

`?__fail=500` makes the bundled mock return an error envelope, so every screen's error
state can be demonstrated. A real backend ignores the parameter. Nothing in the app
depends on it existing.
