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

`price`, `faceValue`, `revenue`, `valueAtRisk` — every one is an
**integer in the currency's minor unit**, paired with an ISO-4217 code:

```json
{ "price": 24550, "currency": "GBP" }   // £245.50
```

Never a float. Never a formatted string. Never a major-unit number.

The whole frontend money layer (`lib/format/money.ts`) assumes this, and the display
currency, the `≈` conversion marker and the seat-edit dialog all do integer arithmetic.

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

### `POST /accounts/register` and payment — tokenized, never a PAN or a CVV

The registration flow (`/accounts/register`, and the rich manual form behind it)
collects the full membership data set, payment included. Payment reaches the API as
`cards[]`, and each card carries **only** a label, the last four digits, the expiry
month and the expiry year:

```json
{ "cards": [{ "label": "Amex personal", "brand": "amex", "last4": "1004",
              "expMonth": 8, "expYear": 2028 }] }
```

**There is no field for the full card number and no field for the CVV, anywhere in
the request schema.** The form derives `last4` in the browser and drops the rest
before submitting; the server schema strips any extra keys, so a client that tries to
send a PAN or a CVV has them discarded rather than stored. This is deliberate and
non-negotiable:

- **Never persist a PAN or a CVV.** Storing a CVV violates PCI-DSS outright; storing a
  PAN puts you in PCI scope you do not want. Replace `last4` with a **processor token**
  (Stripe, Adyen, Braintree) and keep the shape identical — the frontend already treats
  `last4` as an opaque display value.
- The membership number in `membershipNumber` is assigned at registration; the mock
  mints a placeholder, a real backend returns whatever the club/registration issues.

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

## 9. The revenue series is the ledger. The ticket store is inventory.

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

## 10. The frontend automates nothing

Fetch.io **creates a run and reads its state.** That is all it does.

It never issues a request to a club's website. It never drives a browser, a headless
one included. It never holds a proxy connection, never opens an IMAP mailbox, never
solves a challenge, never sees a two-factor code. A `BallotProfile` is a set of numbers
the frontend stores and displays; nothing in this repository acts on `concurrency`,
`delayMinMs`, `proxyGroupId` or `otpSource`.

Every one of those is yours. The backend owns:

- the actual entry into each club's ballot, and whatever session, browser or client it
  takes to make one;
- proxy selection, rotation and health — `proxyGroupId` names a group you resolve;
- the OTP path — reading the mailbox `imapId` points at, or holding a task in
  `NEEDS_OTP` until a code arrives;
- honouring `stopOnRateLimit`, `maxRetries`, `timeoutMs` and the delay window;
- calling `webhookUrl` when a run finishes.

**What breaks:** nothing visible, and that is the point. Read the polling loop in
`lib/api/hooks/useRunMonitor.ts` and it is easy to assume the client is driving the
run — it is not, it is reading a resource. Build the backend to that assumption and a
run works; build it expecting the browser to do half the job and every run sits at
`QUEUED` forever while the UI cheerfully polls an endpoint that never changes.

The one place the frontend touches a credential is
`POST /ballots/accounts/paste`: an `email:password` block goes up **once**, the field is
cleared the moment you answer, and nothing about it is written to `localStorage`, the
URL, the console, or any event payload. Passwords must never appear in a `RunEvent`
message, a task's `lastMessage`, or the CSV export — see §6.

---

## 11. The event cursor is strictly increasing and append-only

`GET /ballots/runs/:id/events?since=<seq>` is the contract the monitor is built on.

- `seq` is **strictly increasing per run and never reused.** Not a timestamp, not a
  row id, not something that resets. Append-only: an event that has been served is
  never edited or removed.
- `?since=N` returns **only** events with `seq > N`. **Not `>=`.**
- They come back **in order**, ascending.
- `meta.lastSeq` is the seq of the **last event in THIS response** — not the run's
  high-water mark. If you truncate at `limit`, `lastSeq` is the last one you actually
  sent.
- Nothing new means `data: []` and `lastSeq` unchanged. **The cursor never goes
  backwards.**
- `meta.hasMore` is true when events exist past `lastSeq`.

**`?since=` must never return the same event twice.** The client does not deduplicate,
by design: it keeps the cursor, requests `since=lastSeq`, and appends what arrives. If
duplicates reach the screen the server broke this contract, and having the client
filter them out would hide exactly the bug worth seeing.

**What breaks:** with `>=` instead of `>`, every poll re-serves the boundary event and
the log grows by one duplicate line per second — for twenty minutes, on the screen an
operator is staring at. With `lastSeq` set to the high-water mark while truncating, the
gap between the truncation point and the high-water mark is skipped forever and
**nobody ever finds out**, because the log looks continuous. With a non-monotonic
`seq`, the cursor moves past events that arrive later and they are never delivered.

A page reload starts at `since=0` and replays the whole run, so keep a run's events for
as long as you keep the run. Do not trim.

---

## 12. Polling stops on terminal statuses

`COMPLETED`, `STOPPED` and `FAILED` are terminal. `PAUSED` is **not** — a paused run
can be resumed from another machine.

| Resource | while live | terminal |
| --- | --- | --- |
| `/ballots/runs/:id` | 2000 ms | stop |
| `/ballots/runs/:id/tasks` | 3000 ms | one last call, then stop |
| `/ballots/runs/:id/events` | 1000 ms | one last call, then stop |

The frontend enforces this and the monitor has been measured doing it: a COMPLETED run
issues zero further requests, and navigating away from a live one drops it to zero
immediately. Mentioned here because it constrains your side too — a terminal run's
state must be **stable**, so a client that stopped polling is not left showing something
that quietly changed afterwards.

---

## 12b. The seat map is a seam

`GET /fixtures/:id/seatmap` returns the venue's seat map. The mock returns a
per-stadium **schematic** — the real named stands of the home club's ground — so the
tab can draw and highlight owned seats today:

```json
{ "fixtureId": "fx_002", "venue": "Anfield", "format": "sections",
  "sections": [{ "id": "the-kop", "name": "The Kop", "side": "S", "aliases": ["kop"] }],
  "source": "mock-schematic",
  "attribution": "Schematic — stand layout, not a to-scale plan." }
```

The tab renders whatever it gets, so a real backend can serve the **provider's published
map** (Ticketmaster, SecuTix, …) behind this same endpoint with `"format": "svg"`, an
inlined `svg` string and an `attribution`, and the tab draws that instead — no frontend
change. If you serve `format: "sections"` you may also return provider section geometry;
if you only have names, keep `aliases` so the client can place an owned seat's `block`
into its stand. Fetching and normalizing the provider map is **your** side (CORS blocks
it from the browser, and it may be a ToS/IP question) — the frontend only displays it.

---

## 13. Mock-only affordances

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

## 14. Checklist

- [ ] Envelope is `{ data, meta, error }` on every response, with explicit `null`s.
- [ ] Money is an integer of minor units plus a currency code. Never a float.
- [ ] Dates are ISO-8601 UTC. Month buckets are `YYYY-MM`, cut in UTC.
- [ ] `Authorization: Bearer` accepted.
- [ ] `passwordMasked` only, at a **constant** width.
- [ ] `POST /accounts/:id/reveal` is audited, rate-limited, `no-store`.
- [ ] Credentials encrypted at rest.
- [ ] Payment is a processor token + `last4` + expiry. **Never** a PAN, **never** a CVV.
- [ ] `byStatus` / `byClub` are sparse — absent means none.
- [ ] `sort` + `order` honoured on every list; `pageSize` capped at 200.
- [ ] `meta.total` and `meta.totalPages` correct — the pager reads them.
- [ ] `/kpis` money comes from the revenue series, not the ticket store.
- [ ] Ballot `seq` is strictly increasing, append-only, never reused.
- [ ] `?since=N` returns `seq > N` — never `>=`, never the same event twice.
- [ ] `meta.lastSeq` is the last event **sent**, not the run's high-water mark.
- [ ] Run events are kept as long as the run — a reload replays from `since=0`.
- [ ] A terminal run's state is stable; nothing changes after polling stops.
- [ ] No password in a `RunEvent`, a task's `lastMessage`, or the CSV export.
- [ ] `app/api/v1` and `lib/mock` deleted.
