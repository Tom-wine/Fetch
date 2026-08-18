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
| `POST`   | `/tickets/group`                | create or merge a group                                      |
| `POST`   | `/tickets/list`                 | create listings from tickets                                 |
| `POST`   | `/tickets/transfer`             | transfer to another user                                     |
| `POST`   | `/tickets/share`                | share with a QR link                                         |
| `DELETE` | `/tickets`                      | bulk delete `{ ids: [] }`                                    |
| `GET`    | `/listings`                     | list + filter                                                |
| `PATCH`  | `/listings/:id`                 | inline price edit, status change                             |
| `POST`   | `/listings/bulk`                | activate / deactivate / reprice / delete                     |
| `GET`    | `/proxies`                      | proxy list                                                   |
| `POST`   | `/proxies/bulk`                 | create from `host:port:user:pass` lines                      |
| `POST`   | `/proxies/:id/test`             | connectivity check                                           |
| `GET`    | `/kpis`                         | dashboard tiles + account-health strip                       |
| `GET`    | `/revenue?groupBy=month`        | chart series                                                 |
| `GET`    | `/activity`                     | dashboard feed                                               |
| `GET`    | `/notifications`                | bell popover                                                 |
| `POST`   | `/notifications/read`           | mark some or all read; omit `ids` for all                    |
| `GET`    | `/search?q=`                    | mixed-type results for ⌘K                                    |

### Filters per resource

| Resource        | Repeatable filters                                          | Other                                 |
| --------------- | ----------------------------------------------------------- | ------------------------------------- |
| `/accounts`     | `club`, `status`, `membershipType`, `tag`, `proxyId`         | —                                     |
| `/fixtures`     | `club`, `competition`, `provider`                            | `when=all\|upcoming\|past`, `accountId` |
| `/fixtures/:id/tickets` | `accountId`, `block`, `row`, `status`                | —                                     |
| `/listings`     | `platform`, `accountId`, `status`, `fixtureId`               | —                                     |
| `/proxies`      | `status`, `groupId`                                          | —                                     |
| `/activity`     | `source`, `kind`                                             | —                                     |
| `/notifications`| `kind`                                                       | `unread=true`                         |

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
