# Fetch.io — API contract

This is the seam. The frontend talks to exactly one thing, in exactly one shape.
Match this contract and the app works against your backend without a single component
or hook change.

Machine-readable version: [`openapi.json`](./openapi.json), OpenAPI 3.1, generated
from the Zod schemas by `node --experimental-strip-types scripts/generate-openapi.mjs`.
The schemas in `lib/api/schemas.ts` are the source of truth — the spec is derived from
them, so the two cannot drift.

---

## How to attach a real backend

1. Set one environment variable:

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.fetch.io/v1
   ```

2. Match this contract.
3. Done.

There is no third step. `lib/api/client.ts` is the only file in the app that calls
`fetch`, and it reads that variable. Delete `app/api/v1/**` when you no longer want the
bundled mock; nothing else references it.

If your backend diverges, the app does not silently render `undefined` — the Zod parse
fails at the seam and throws an `ApiError` naming the offending path, e.g.
*"The API response did not match the contract at `0.loyaltyPoints`: expected int."*
That error surfaces in the same `ErrorState` every screen already has.

---

## Base path and versioning

Base path is **`/api/v1`**, versioned from day one. Every path below is relative to it.

---

## Envelope

Every response, success or failure, is the same three keys.

**Success**

```json
{ "data": { "…": "…" }, "meta": null, "error": null }
```

**List** — `data` is an array and `meta` is populated:

```json
{
  "data": [ { "…": "…" } ],
  "meta": { "page": 1, "pageSize": 25, "total": 64, "totalPages": 3 },
  "error": null
}
```

`meta` carries two extra optional keys, and **only** `/ballots/runs/:id/events` sets
them: `lastSeq` (the cursor for the next call) and `hasMore` (whether the run holds
events beyond the ones just returned). See the event-stream section below.

**Error** — always HTTP 4xx/5xx *and* an error body:

```json
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need attention.",
    "fields": { "price": ["Too small: expected number to be >0"] }
  }
}
```

`fields` is optional and keyed by field name, so a form can attach messages to inputs
rather than dropping a toast. Codes in use: `VALIDATION_ERROR`, `NOT_FOUND`,
`INJECTED_FAILURE`, `INTERNAL`. The client adds `NETWORK_ERROR`, `BAD_RESPONSE`,
`HTTP_ERROR` and `CONTRACT_VIOLATION` for failures that never reached your handler.

---

## Query parameters

Identical on every list endpoint:

```
?page=1&pageSize=25&sort=kickoff&order=asc&q=arsenal&club=arsenal&club=chelsea
```

| Param      | Meaning                                                        |
| ---------- | -------------------------------------------------------------- |
| `page`     | 1-based. Default 1.                                             |
| `pageSize` | Default 25, max 200.                                            |
| `sort`     | Field name. Dotted paths allowed (`venue.city`).                |
| `order`    | `asc` \| `desc`. Default `asc`.                                 |
| `q`        | Free-text search across that resource's searchable fields.      |
| *filters*  | Resource-specific. **Repeated keys mean OR.**                   |

`?club=arsenal&club=chelsea` returns accounts at either club. Filters of different
names are ANDed together: `?club=arsenal&status=locked` means Arsenal **and** locked.

Order of operations on every list: filter → search → sort → paginate.

---

## Conventions that are not negotiable

**IDs** are opaque strings. Never assume numeric, sequential, or sortable.

**Dates** are ISO-8601 UTC strings. The server never formats a date; the client owns
locale and timezone entirely (`lib/format/date.ts`). Do not send `"14/09/2026"`.

**Money** is an **integer of minor units** plus a currency code — `24500` and `"GBP"`
means £245.00. Never a float, never a formatted string, never a combined
`"£245.00"`. Every monetary field in every resource follows this: `price`,
`faceValue`, `floorPrice`, `faceValueTotal`, `valueAtRisk`, `totalRevenue`,
`monthRevenue`, `revenue`.

**Mutations return the full updated resource**, not a partial or a bare `{ ok: true }`.
The client replaces its cache entry wholesale; a partial response would leave it
merging a guess.

**Passwords are never returned.** Account responses carry `passwordMasked` only.
`POST /accounts/:id/reveal` is the single exception: it returns the plaintext once,
is audit-logged server side, and responds `Cache-Control: no-store`. A real backend
must encrypt these at rest.

---

## Auth

```
Authorization: Bearer <token>
```

Injected in one place — `lib/api/client.ts`. The bundled mock ignores it; your backend
must not. Call `setAuthToken(token)` from the client module, or leave a token under
`localStorage.fetch_token`.

---

## Mock-only behaviour

These two exist so the frontend can be built and demonstrated before a backend does.
A real backend ignores both.

**Latency** — mock routes sleep around `MOCK_LATENCY_MS` (default 400ms, jittered into
the 300–600ms band) so skeleton states are genuinely exercised. Set `MOCK_LATENCY_MS=0`
in tests.

**Failure injection** — `?__fail=500` on any route returns the error envelope with that
status, so every screen's error state is demonstrable on demand. Any 4xx/5xx works;
`?__fail=422` is useful for form paths.

```bash
curl '/api/v1/accounts?__fail=500'
# {"data":null,"meta":null,"error":{"code":"INJECTED_FAILURE","message":"…"}}
```

Demonstrate `?__fail=` with the tab in the FOREGROUND. TanStack Query pauses retries
while `document.visibilityState === 'hidden'`, so in a background tab a failed query
sits paused and the error state never renders — on every screen, by design. Nothing is
broken; the screen is waiting for you to come back.

---

## Endpoints

| Method   | Path                            | Purpose                                                     |
| -------- | ------------------------------- | ----------------------------------------------------------- |
| `GET`    | `/accounts`                     | list + filter + sort + paginate                              |
| `POST`   | `/accounts`                     | create one (manual entry)                                    |
| `GET`    | `/accounts/:id`                 | one account                                                  |
| `PATCH`  | `/accounts/:id`                 | edit                                                         |
| `DELETE` | `/accounts`                     | bulk delete `{ ids: [] }`                                    |
| `POST`   | `/accounts/bulk`                | bulk create from parsed CSV rows → `{ created, updated, skipped, errors[] }` |
| `POST`   | `/accounts/import/validate`     | dry run a parsed CSV → per-row verdicts                      |
| `POST`   | `/accounts/:id/reveal`          | plaintext password, once, audit-logged                       |
| `POST`   | `/accounts/:id/login`           | maintenance action                                           |
| `POST`   | `/accounts/:id/relogin`         | maintenance action                                           |
| `POST`   | `/accounts/:id/reset-password`  | maintenance action                                           |
| `GET`    | `/accounts/stats`               | counts by status and by club                                 |
| `GET`    | `/clubs`                        | reference data for pickers                                   |
| `GET`    | `/fixtures`                     | inventory list                                               |
| `GET`    | `/fixtures/:id`                 | fixture detail                                               |
| `GET`    | `/fixtures/:id/tickets`         | seat-level rows                                              |
| `PATCH`  | `/tickets/:id`                  | edit one seat — `price`, `block`, `row`, `seat`, `visibility` |
| `POST`   | `/tickets/group`                | create or merge a group                                      |
| `POST`   | `/tickets/transfer`             | transfer to another user                                     |
| `POST`   | `/tickets/share`                | share with a QR link                                         |
| `DELETE` | `/tickets`                      | bulk delete `{ ids: [] }`                                    |
| `GET`    | `/proxies`                      | proxy list                                                   |
| `POST`   | `/proxies/bulk`                 | create from `host:port:user:pass` lines                      |
| `POST`   | `/proxies/:id/test`             | connectivity check                                           |
| `GET`    | `/kpis`                         | dashboard tiles + account-health strip                       |
| `GET`    | `/revenue?groupBy=month`        | chart series                                                 |
| `GET`    | `/activity`                     | dashboard feed                                               |
| `GET`    | `/notifications`                | bell popover                                                 |
| `POST`   | `/notifications/read`           | mark some or all read; omit `ids` for all                    |
| `GET`    | `/search?q=`                    | mixed-type results for ⌘K                                    |
| `GET`    | `/ballots/profiles`             | run profiles — pacing, retries, proxy group, OTP source       |
| `POST`   | `/ballots/profiles`             | create                                                        |
| `PATCH`  | `/ballots/profiles/:id`         | edit                                                          |
| `DELETE` | `/ballots/profiles/:id`         | delete; the shipped `bpf_default` is refused with a reason    |
| `GET`    | `/ballots/imap`                 | mailboxes an `otpSource: "imap"` profile can read codes from  |
| `POST`   | `/ballots/accounts/paste`       | load `email:password` lines → `{ created, updated, skipped, errors[] }` |
| `GET`    | `/ballots/accounts/results`     | last ballot result per account, for the pool table            |
| `GET`    | `/ballots/runs`                 | run history — newest first unless `sort` says otherwise       |
| `POST`   | `/ballots/runs`                 | **create and start** — there is no separate start call        |
| `GET`    | `/ballots/runs/:id`             | one run's state (poll 2s while not terminal)                  |
| `DELETE` | `/ballots/runs/:id`             | remove a run from the history                                 |
| `POST`   | `/ballots/runs/:id/pause`       | freeze the run's clock                                        |
| `POST`   | `/ballots/runs/:id/resume`      | restart it from where it froze                                |
| `POST`   | `/ballots/runs/:id/stop`        | end early; everything unattempted becomes `SKIPPED`           |
| `POST`   | `/ballots/runs/:id/retry-failed`| **a NEW run** holding exactly this run's failures             |
| `GET`    | `/ballots/runs/:id/tasks`       | per-account rows, paginated + filterable (poll 3s)            |
| `GET`    | `/ballots/runs/:id/events`      | **append-only cursor feed** (poll 1s) — see below             |
| `GET`    | `/ballots/runs/:id/export`      | results as CSV. A file, not the envelope. No password column. |

### Filters per resource

| Resource        | Repeatable filters                                          | Other                                 |
| --------------- | ----------------------------------------------------------- | ------------------------------------- |
| `/accounts`     | `club`, `status`, `membershipType`, `tag`, `proxyId`         | —                                     |
| `/fixtures`     | `club`, `competition`, `provider`                            | `when=all\|upcoming\|past`, `accountId` |
| `/fixtures/:id/tickets` | `accountId`, `block`, `row`, `status`                | —                                     |
| `/proxies`      | `status`, `groupId`                                          | —                                     |
| `/activity`     | `source`, `kind`                                             | —                                     |
| `/notifications`| `kind`                                                       | `unread=true`                         |
| `/ballots/runs` | `status`                                                     | —                                     |
| `/ballots/runs/:id/tasks` | `status`, `clubId`                                 | —                                     |

### Ticket writes

`PATCH /tickets/:id` takes a partial and is strict: an unrecognised key is a 422, not
a silent no-op. It is the only write that moves `visibility` in both directions, which
is what makes the seat table's eye a toggle rather than a one-way reveal.
`POST /tickets/share` also reveals a seat, but as a side effect of publishing a QR
link — same field, different intent.

`POST /tickets/group | transfer | share` each return `{ tickets }` — the full set of
updated seats, so the client replaces those cache entries wholesale rather than merging
a partial.

**Not implemented, and not waiting on a route:** a wallet pass. A `.pkpass` is a signed
bundle and a Google Wallet pass is a signed JWT, so both need a private key that must
never reach a browser. The menu item stays disabled and says so.

---

## Ballots

Three endpoints in this group did not exist when §B4 was first written and are part of
the contract now.

- **`GET /ballots/imap`** — without it, a profile with `otpSource: "imap"` had no
  mailbox to point at, so the required `imapId` could never be satisfied and the
  launcher's IMAP block could never fire. Returns `{ id, email, host, status, lastCheckedAt }`.
  `status` is `ok` or `error`; a profile pointed at a mailbox that no longer answers is
  a real state the launcher warns about.
- **`GET /ballots/accounts/results`** — the last-run / last-result join behind the pool
  table's two extra columns, done once on the server. The alternative was a request per
  run inside a React component, growing with the history rather than with what is on
  screen. Returns one row per account that has been attempted at least once:
  `{ accountId, runId, runLabel, at, status, httpStatus?, message?, entryRef? }`.
- **`GET /ballots/runs/:id/export`** — a CSV file rather than the envelope, because it
  is a download. **No password column, ever.**

### Ballot accounts are ordinary accounts

There is no second account model. A ballot account is an `Account` whose `club` is one
of the seven ballot clubs, which is what gives the pool the same password masking, the
same audited reveal, the same proxies and the same CSV import as `/accounts`.

### The event stream

This is the piece not to get wrong.

```
GET /ballots/runs/:id/events?since=0&limit=200
{
  "data": [ { "id": "…", "seq": 1, "runId": "…", "at": "…", "level": "info",
              "code": "RUN_STARTED", "message": "Run started with 48 accounts.",
              "httpStatus": null } ],
  "meta": { "page": 1, "pageSize": 200, "total": 1, "totalPages": 1,
            "lastSeq": 1, "hasMore": false },
  "error": null
}
```

- **Only `seq > since` comes back. Not `>=`.** A client that echoes back the cursor it
  was given must receive nothing, or it re-reads the same row forever.
- Events come back **in order**, ascending by `seq`.
- **`meta.lastSeq` is the seq of the last event in THIS response**, not the run's
  high-water mark. Returning the high-water mark while truncating at `limit` would skip
  everything in between.
- When nothing is new, `data` is `[]` and `lastSeq` is unchanged — **the cursor never
  goes backwards**.
- `hasMore` is true when the run holds events past `lastSeq`, so a client that has
  fallen behind knows to call again immediately rather than wait for the next tick.

**The client never deduplicates.** If it has to, this endpoint lied. A page reload
starts from `since=0` and replays the whole run, which is why events are kept rather
than trimmed.

### Polling cadence

Every interval must stop on a terminal status (`COMPLETED`, `STOPPED`, `FAILED`) and on
unmount. `PAUSED` is **not** terminal — a paused run can be resumed from elsewhere.

| Resource | while live | terminal |
| --- | --- | --- |
| `/ballots/runs/:id` | 2000 ms | stop |
| `/ballots/runs/:id/tasks` | 3000 ms | one last call, then stop |
| `/ballots/runs/:id/events` | 1000 ms | one last call, then stop |

The two "one last call" rows are not decoration. The run endpoint is what discovers the
run went terminal; without a final read of the other two, the table freezes one poll
short and shows accounts as `QUEUED` on a run that has already marked them `SKIPPED`.

### Run writes

`POST /ballots/runs` creates **and starts** — a run that exists but has not begun is a
state with no meaning to an operator. Omit `accountIds` to mean "every eligible account
in `clubIds`", resolved server-side at start, so it stays correct if the pool grew while
the launcher was open.

`POST /ballots/runs/:id/retry-failed` returns a **different** run. The original is left
untouched as the record of what happened. Runs denormalise `profileName` for the same
reason: renaming a profile next week must not rewrite the history of a run that already
happened, which is also why a profile a run has used is not deleted out from under it.

---

## The three layers above the seam

```
React components          never call fetch, never call the client
      │
TanStack Query hooks      lib/api/hooks/*  — keys from one factory, mutations optimistic
      │
Typed endpoint functions  lib/api/endpoints.ts — one thin function per endpoint
      │
apiFetch                  lib/api/client.ts  ← THE SEAM: URL, auth, query, envelope, Zod
      ▼
NEXT_PUBLIC_API_BASE_URL
```

Every mutation hook is built on `useOptimisticMutation`, so all of them behave the
same way: cancel in-flight queries → snapshot the cache → apply the optimistic update →
toast on success → **roll the snapshot back and toast the error on failure**. That is
why the contract insists on full resources from mutations.
