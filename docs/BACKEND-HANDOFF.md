# Fetch.io — backend handoff

Everything a real backend has to know to replace the bundled mock without the frontend
noticing. The wire format lives in [`API-CONTRACT.md`](./API-CONTRACT.md) and the
machine-readable version in [`openapi.json`](./openapi.json), generated from the Zod
schemas in `lib/api/schemas.ts`.

This file is the part that a contract cannot express: the decisions where **getting it
wrong breaks the frontend silently rather than loudly.** Each one below has a "what
breaks" line, because a 500 gets noticed and a quietly-wrong number does not.

---

## 1. The seam

Every request in the app goes through one function, `apiFetch` in `lib/api/client.ts`.
Nothing else calls `fetch`. That function reads exactly two things from the outside
world:

```ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
```

…and a bearer token (see §5). So pointing the app at your server is one variable:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.fetch.io/v1
```

**`NEXT_PUBLIC_*` is inlined at build time, not read at runtime.** Change it and
rebuild. Changing it in a running dev server does nothing until `.next` is rebuilt,
and — because two dev servers in one checkout share `.next` — a second server started
with a different value rewrites the first one's bundle. If you are testing the seam,
use one server and clear `.next` first.

### Proving it

```bash
rm -rf .next && NEXT_PUBLIC_API_BASE_URL=http://localhost:9999/v1 npm run dev
```

`/settings → API` shows the live value and whether the build is on the bundled mock or
a remote server. Every request then goes to the dead host and `apiFetch` turns the
connection failure into a normal `ApiError` rather than a crash:

```
Could not reach the API at http://localhost:9999/v1.
Check the connection and NEXT_PUBLIC_API_BASE_URL.
```

Clear `.next` again afterwards so the bogus URL is not left baked into a bundle.

### Deleting the mock

`app/api/v1/**` is the bundled mock — Next.js route handlers over a seeded in-memory
store. It exists so the frontend could be built and demonstrated before a backend
did. **Delete the whole directory when you are ready.** Nothing outside it imports
from it; `lib/mock/` goes with it. The only thing you lose is `?__fail=` and
`MOCK_LATENCY_MS`, which are mock-only affordances a real server should ignore.

---

## 2. The envelope

Every response, success or failure, is the same three keys:

```jsonc
{ "data": <payload or null>, "meta": <paging or null>, "error": <error or null> }
```

Success, single resource:

```json
{ "data": { "id": "acc_014", "email": "a.almeida24@mail.com" }, "meta": null, "error": null }
```

Success, list — `meta` carries paging and nothing else:

```json
{
  "data": [ { "id": "acc_014" }, { "id": "acc_015" } ],
  "meta": { "page": 1, "pageSize": 25, "total": 64, "totalPages": 3 },
  "error": null
}
```

Failure — `data` and `meta` are `null`, never omitted:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need attention.",
    "fields": { "email": ["That address is already in use."] }
  }
}
```

`code` is a stable machine string; `message` is one plain sentence shown to the
operator. `fields` is optional and only meaningful on 422 — it maps a form field name
to its messages, and the import wizard and the manual-entry form render it per field.

**What breaks:** the client Zod-parses the envelope. A response that omits `meta`, or
returns a bare array, fails the parse and surfaces as an error with a readable path
rather than rendering `undefined` three components deep. That is deliberate — but it
means a "helpful" shortcut on your side is a hard failure on ours.

---

## 3. Money is an integer of minor units. Always.

`price`, `faceValue`, `revenue`, `valueAtRisk`, `floorPrice` — every one is an
**integer in the currency's minor unit**, paired with an ISO-4217 code:

```json
{ "price": 24550, "currency": "GBP" }   // £245.50
```

Never a float. Never a formatted string. Never a major-unit number.

The whole frontend money layer (`lib/format/money.ts`) assumes this, and the display
currency, the `≈` conversion marker and the reprice dialog all do integer arithmetic.

**What breaks:** `245.5` parses fine and renders as £2.46. A float is the failure mode
that produces plausible wrong numbers on every screen at once, which is why the schema
uses `z.int()` and rejects it at the seam instead.

---

## 4. Dates are ISO-8601 UTC strings. The server never formats.

```json
{ "kickoff": "2026-08-22T14:00:00.000Z" }
```

The client owns every rendering decision — locale, timezone, relative time — from the
single setting in `/settings → Preferences`. Do not send `"22/08/2026"`, do not send a
local time, do not send a pre-formatted label.

Month buckets on `GET /revenue` are the one exception in shape: a `period` key of
`"2026-08"`, cut **in UTC**. The client renders it with `formatMonth`, which reads it
in UTC for exactly this reason — `2026-08` at midnight UTC is still July in New York,
and honouring the viewer's zone would relabel a whole column of the chart.

---

## 5. Auth

One header, attached by `apiFetch` and nowhere else:

```
Authorization: Bearer <token>
```

The token is held in `localStorage` under `fetch_token` and can be set from
`/settings → API`. There is no refresh flow, no cookie and no CSRF token today —
when you add them, `lib/api/client.ts` is the only file that changes.

---

## 6. Credentials

**The API returns `passwordMasked` only.** Plaintext appears in exactly one response,
from one endpoint, once.

### The mask is a CONSTANT width

```json
{ "passwordMasked": "••••••••••" }    // always ten, whatever the password
```

Not one bullet per character.

**What breaks:** a variable-width mask publishes every password's length, in a table,
sorted and filterable. Twenty rows of `••••••` next to one row of `••••••••••••••••`
tells an attacker exactly which account to spend their time on. The frontend renders
whatever string you send, so this is your control, not ours.

### `POST /accounts/:id/reveal`

The single endpoint that returns plaintext. It must be:

- **a POST**, deliberately not a cacheable GET — it is an audited action, not a read;
- **audit-logged** with the account id and the caller, **never the secret itself**;
- **rate-limited**, per caller and per account;
- **`Cache-Control: no-store`**.

The UI re-masks after ten seconds and never writes the value into the query cache.
That is a courtesy, not a control. **The requirement on your side is encryption at
rest**, and a reveal that is logged loudly enough to notice.

The import path never persists a password client-side either: it lives in memory for
the length of the wizard and is POSTed once.

---

## 7. Enum-keyed maps are SPARSE

`GET /accounts/stats` returns counts keyed by enum:

```json
{
  "total": 64,
  "byStatus": { "active": 46, "needs_login": 6, "needs_otp": 4, "locked": 4 },
  "byClub": { "arsenal": 12, "liverpool": 9, "man-city": 8 }
}
```

**An absent key means no rows, not zero.** Do not pad the object with every enum
member set to `0`, and do not send `null` for the empty ones.

The schemas use `z.partialRecord(...)` and the types are `Partial<Record<…>>`, so the
client already treats a missing key as "none" — the health strip renders `0` for it
and the club tabs omit the club entirely.

**What breaks:** padding is not wrong on screen, but it is a different payload on
every request and it makes "which clubs does this operator actually hold?" a question
you can no longer answer from the response. The sparse form is the answer.

---

## 8. Sorting is server-side on every list

Every list endpoint takes `sort` and `order`, and the client never re-sorts what you
return. A column is only offered as sortable when the API can order by it — the sort
registries in `components/*/sorting.ts` are the list of what your `ORDER BY` must
support, and a column missing from them is a column with no arrow in the header.

Paging follows from that: `page` and `pageSize`, `meta.total` and `meta.totalPages`,
and `pageSize` is capped at 200.

### Normalised-currency sorting is a BACKEND capability

`GET /listings?sort=price` orders by each listing's price **in its own currency**,
because that integer is the only price you hold.

`/mylistings` has a display-currency normaliser: pick GBP and every row is shown
converted. The two do not agree. A €325.30 listing sorts above a £309.20 one —
`32530 > 30920` — but displayed in pounds the euro row is the smaller number, so the
column looks broken.

The UI does not fake it. When a normaliser is active **and** the visible rows really
are out of order, it renders a small muted `sorted by native currency` note beside the
PRICE header, and leaves the header sortable because the server does honour the sort.

To make normalised sorting real, you need one of:

1. **Store a normalised amount** alongside the native one, refreshed when the rate
   moves, and accept `sort=priceNormalised`.
2. **Sort by a rate-converted expression** at query time:
   `ORDER BY price * rate(currency, :display)`.
3. **Accept a `displayCurrency` parameter** on `GET /listings` and let the server
   decide. This is the one we would pick — it keeps the rate on the server, matches
   what the UI already knows, and leaves you free to change strategy later.

If you implement any of them, the frontend change is small: send the display currency
and drop the note.

---

## 9. `club-exchange` is a destination, never an origin

`Platform` has six members. Five are secondary marketplaces (`viagogo`, `stubhub`,
`ticombo`, `gigsberg`, `fanpass`). The sixth, `club-exchange`, is the club's own
resale channel and is different in kind:

- a listing **arrives** there through `POST /tickets/resell-face-value`, at the
  ticket's `faceValue`;
- a listing is **never created** there. It is not offered in the List picker, because
  face value is the price and there is nothing to choose.

The registry marks this with `kind: 'club-exchange'` rather than by branching on the
id, and the seed builds listings from marketplaces only.

**What breaks:** if your seeder or your import path can mint a `club-exchange` listing
directly, you have inventory on a channel nobody chose, at a price nobody set.

---

## 10. The revenue series is the ledger. The ticket store is inventory.

Two different questions, and they are allowed to disagree about **volume**:

- `GET /revenue?groupBy=month` is the **historical ledger** — what has been earned,
  month by month, including seats sold long ago and long gone.
- `GET /tickets` / `GET /fixtures/:id/tickets` is **current inventory** — the seats
  held right now, for fixtures that have not been played.

`GET /kpis` takes **every money figure from the revenue series**: `totalRevenue` is the
sum of all buckets, `ticketsSold` the sum of the series' own counts, `monthRevenue` the
current month's bucket. It does not sum the ticket store.

**What breaks:** this was a real bug. `/kpis` used to sum the ticket store for the
all-time total and take the month from the series, which put "this month" at **nine
times "all time"** on adjacent tiles of the same dashboard row. They may disagree about
how many tickets exist. They must not disagree about money.

---

## 11. Mock-only affordances

Both are ignored by a real backend and can be dropped with `app/api/v1`.

**`MOCK_LATENCY_MS`** (default 400, jittered into 300–600ms) so skeleton states are
genuinely exercised. `MOCK_LATENCY_MS=0` in tests.

**`?__fail=<status>`** on any route returns the error envelope with that status, so
every screen's error state is demonstrable on demand.

Demonstrate `?__fail=` with the tab in the **foreground**. TanStack Query pauses
retries while `document.visibilityState === 'hidden'`, so in a background tab a failed
query sits paused and the error state never renders — on every screen, by design.
Nothing is broken; the screen is waiting for you to come back.

---

## 12. Checklist

- [ ] Envelope is `{ data, meta, error }` on every response, with explicit `null`s.
- [ ] Money is an integer of minor units plus a currency code. Never a float.
- [ ] Dates are ISO-8601 UTC. Month buckets are `YYYY-MM`, cut in UTC.
- [ ] `Authorization: Bearer` accepted.
- [ ] `passwordMasked` only, at a **constant** width.
- [ ] `POST /accounts/:id/reveal` is audited, rate-limited, `no-store`.
- [ ] Credentials encrypted at rest.
- [ ] `byStatus` / `byClub` are sparse — absent means none.
- [ ] `sort` + `order` honoured on every list; `pageSize` capped at 200.
- [ ] `meta.total` and `meta.totalPages` correct — the pager reads them.
- [ ] `club-exchange` reachable only by resale.
- [ ] `/kpis` money comes from the revenue series, not the ticket store.
- [ ] `app/api/v1` and `lib/mock` deleted.
