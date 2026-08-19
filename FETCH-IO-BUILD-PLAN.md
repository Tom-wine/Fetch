# Fetch.io — Frontend Build Plan

> **Product:** Premier League ticketing **account manager** + resale inventory dashboard.
> **Scope of this plan:** frontend only. No backend. Every read/write goes through a placeholder API
> designed so a real backend can be attached by changing one environment variable.
> **Stack (decided):** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Table ·
> TanStack Query · Recharts · Zod · next-themes.
> **Theme (decided):** dark-first (the brand is a black canvas), with a fully correct light theme.
> **Scope (decided):** full 5-screen parity — Dashboard, Accounts, My Tickets, Fixture Detail, My Listings —
> with the account import (manual + bulk CSV) built to production depth.
> Derived from `tikeyclonespec.md` (reverse-engineered from Tikey Manager v3.0) and re-skinned to the Fetch.io logo.

---

## 1. What Fetch.io is

Fetch.io is the control room for someone who runs **many Premier League ticketing accounts**. Club ticketing
(Arsenal, Man City, Liverpool, Spurs, Man Utd, Chelsea…) is membership-gated: each account is a membership with
its own credentials, client reference, loyalty points, purchase history and eligibility window. A serious
operator holds tens to hundreds of these across clubs, buys allocations when they drop, and relists on
secondary marketplaces (Viagogo, StubHub, Ticombo, GigsBerg).

The product answers four questions, in this order of frequency:

| Question | Screen |
|---|---|
| Are my accounts healthy — logged in, unlocked, eligible? | `/accounts` |
| Did anything sell, and what am I exposed to? | `/dashboard` |
| What do I own, per fixture? | `/mytickets` → `/mytickets/fixture/[id]` |
| What is live on the market and at what price? | `/mylistings` |

**The core loop:** import accounts (manual or bulk CSV) → accounts buy tickets → tickets arrive in inventory,
grouped by fixture → group seats into lots → list on marketplaces → monitor and reprice → track the sale →
deliver (transfer / PDF / wallet / QR link).

**The MVP promise:** *"Every Premier League account and every ticket you own, in one table — imported in
under a minute, listed in one click."*

### What changes vs. the Tikey spec

| Tikey | Fetch.io |
|---|---|
| "Retailer" (Ticketmaster, AXS, Eventim…) | **Club** — the 20 Premier League clubs — plus a small set of platform providers (Ticketmaster UK, Eventim, StubHub Exchange) |
| Accounts are a secondary tab | **Accounts is the anchor of the product.** Bulk CSV import is a first-class, fully-scaffolded flow, not a dropzone |
| Event = any concert/sport | **Fixture** — home team, away team, competition, matchweek, kickoff |
| Generic loyalty | Membership type + **loyalty points** + eligibility, because that is what decides who can buy |
| Mixed EU currencies | GBP-first, with EUR/USD normaliser retained |

---

## 2. The user

| | |
|---|---|
| **Who** | Semi-pro to pro PL ticket operator. 20–500 accounts, 10–2000 tickets in flight. Not a developer. |
| **Session shape** | Opens 5–20× a day. Most sessions are 30 seconds ("did anything sell / is anything locked"). A few are 20 minutes (bulk import, bulk relist, on-sale prep). |
| **Primary object** | The **account** before an on-sale; the **fixture** after it. Never the individual seat, until they act. |
| **Anxiety** | (a) accounts silently locked or logged out before a big on-sale; (b) money tied up in unsold seats as kickoff approaches. Every screen should answer one of those two. |
| **Vocabulary** | account, club, membership, client reference, loyalty points, fixture, matchweek, allocation, listing, lot/group, block/section, row, seat, face value, floor price, transferred, delisted. |

---

## 3. Brand & design tokens

Sampled directly from the uploaded logo: a pure-black canvas, a glowing ticket streaking left-to-right,
and a wordmark that runs deep blue → sky cyan. Dominant sampled values: `#0060D0`, `#2090E0`, `#50C0F0`,
`#B2E1F5` on `#000000`.

The design language that follows from that logo: **black canvas, one electric blue, motion implied by
gradient and glow, everything else neutral.** Colour is a signal, never decoration.

### 3.1 Palette

```ts
// Tailwind v4 is CSS-first: these live in app/globals.css as CSS variables in :root / .dark,
// surfaced as utilities through @theme inline. There is no tailwind.config.ts.
// (hex, to match the brand exactly)
export const tokens = {
  dark: {
    bg:            '#07080B', // app + sidebar canvas — near-black, the logo背景
    surface:       '#0E1116', // cards, panels, table container
    surfaceRaised: '#161A21', // table header row, inputs, popovers, hover
    surfaceHover:  '#1C222B', // row hover, ghost-button hover
    border:        '#242A34',
    borderStrong:  '#333B48', // focused inputs, dividers that must read
    text:          '#ECF2F8', // 16.8:1 on surface
    textMuted:     '#9AA6B8', // secondary copy — 7.7:1 on surface
    textFaint:     '#7F8B9C', // timestamps, disabled — 5.0:1 on surfaceRaised, 4.6:1 on surfaceHover
  },
  light: {
    bg:            '#FFFFFF',
    surface:       '#FFFFFF',
    surfaceRaised: '#F3F5F9',
    surfaceHover:  '#E9EDF4',
    border:        '#E1E6EE',
    borderStrong:  '#C8D1DF',
    text:          '#0B1220', // 18.7:1 on white
    textMuted:     '#5A6577', // 5.9:1 on white
    textFaint:     '#606A7D', // 5.0:1 on surfaceRaised, 4.6:1 on surfaceHover — unlike the source app
  },
  brand: {
    primary:      '#1A8CF0', // THE logo blue. Links, active nav, selection, focus ring, chips on dark
    primarySolid: '#0B6FD4', // filled buttons with white text — 4.95:1. The logo's deep blue
    primaryHover: '#1A8CF0', // hover state of a solid button (lightens toward the accent)
    primaryPress: '#0A5FB8',
    primaryInk:   '#0B63C9', // primary *text* on light backgrounds — 5.8:1 on white
    cyan:         '#5FD0FA', // the highlight in the logo streak — accents, sparkline, glow
    deep:         '#0057C8', // gradient start
  },
  status: {
    success:      '#22D18A', // money in, ACTIVE, healthy account
    warning:      '#F5A524', // needs attention: relogin, OTP, expiring membership
    danger:       '#FF4D6A', // locked, blocked, delete, SOLDOUT
    violet:       '#A78BFA', // sold count, block numbers
    neutralChip:  '#9AA6B8',
  },
  // Light-mode text variants for status colours (chips keep the hue as a background tint,
  // but any status *text* on a white surface uses these):
  statusInk: { success: '#0A7751', warning: '#A94E08', danger: '#C11D3A', violet: '#6D28D9' },
  // Dark mode collapses each ink onto its raw hue, with ONE exception: primaryInk is a
  // step lighter than primary (#2692F1), because the primary chip is a 12% tint and the
  // raw hue reads 4.34:1 on surfaceRaised. See scripts/check-contrast.ts.
}
```

> **Why two blues.** `primary` (#1A8CF0) is the accent — it reads at 5.5:1 on the dark surface, so links,
> active nav and chip text use it. White text on that same blue is only 3.5:1, so **filled buttons use
> `primarySolid` (#0B6FD4)**, which carries white at 4.95:1. Both are sampled from the logo. Every value in
> this table was verified with `scripts/check-contrast.ts`; do not substitute.

### 3.2 Signature gradient — use sparingly

```css
--fetch-gradient: linear-gradient(135deg, #0057C8 0%, #1A8CF0 48%, #6FD3FA 100%);
--fetch-glow:     0 0 24px -4px rgba(26,140,240,.55);
```

Allowed uses, and nowhere else:

1. The sidebar logo mark.
2. `StatTile` icon squares (48px rounded square, gradient background, white icon).
3. The dashboard onboarding / promo banner.
4. A 1px top hairline on the active sidebar item.
5. The `Import accounts` primary CTA on the empty accounts state — with `--fetch-glow` on hover only.

Never a gradient on body text, table rows, or more than one element in the same viewport region.

### 3.3 Typography — mono-first developer aesthetic

**Two families, no third.** The reference points are Linear, Vercel, Railway, Resend and
[proxylabs.app](https://proxylabs.app) — mono as the *default UI font*, not just for code.

```css
--font-display: 'Outfit', system-ui, sans-serif;                    /* weight 900 only, ALWAYS uppercase */
--font-mono:    'JetBrains Mono', ui-monospace, 'SF Mono', monospace; /* the default font of the app */
--font-prose:   'Outfit', system-ui, sans-serif;                    /* weight 400, multi-line prose only */
```

- **Outfit Black (900), uppercase** — page titles, section headings, KPI values, the logo wordmark.
  Nothing else. Never longer than about five words, never a paragraph, never sentence case.
- **JetBrains Mono** — *everything else*: nav, buttons, table cells and headers, chips, inputs, stat
  labels, form labels, breadcrumbs, tooltips, timestamps. This is the body font.
- **Outfit Regular (400)** — the one escape hatch, for genuine prose that runs past two lines:
  dropdown-item descriptions, empty-state explanations, CSV error explanations, feed entry bodies,
  onboarding copy. Mono is unreadable in paragraphs, and this keeps us at two families.

| Role | Family | Spec |
|---|---|---|
| h1 page title | Outfit 900 | `28px / uppercase / -0.02em` |
| h2 section | Outfit 900 | `18px / uppercase / -0.01em` |
| KPI value | Outfit 900 | `32px / -0.03em / tabular` |
| section label | Mono 400 | `11px / lower_snake_case / 0.08em / muted`, prefixed `// ` |
| card title | Mono 600 | `14px / UPPER_SNAKE / 0.04em` |
| body / table cell | Mono 400 | `13px / -0.01em` |
| prose (2+ lines) | Outfit 400 | `14px / 1.6 line-height` |
| table header | Mono 600 | `11px / UPPER_SNAKE / 0.08em / muted` |
| numeric cell | Mono 600 | `13px` (JetBrains Mono is tabular by default — `tabular-nums` is free) |
| button | Mono 600 | `12px / UPPER_SNAKE / 0.06em` |
| chip | Mono 500 | `11px / UPPERCASE / 0.04em` |
| input | Mono 400 | `13px` |
| caption / timestamp | Mono 400 | `11px / muted` |

**Mono practicalities — these are not optional:**

- `font-variant-ligatures: none` globally. JetBrains Mono turns `->`, `!=` and `=>` into glyphs, which
  corrupts data cells and CSV previews. Re-enable it *only* inside `<pre>` and the CSV preview block.
- Mono runs ~12% wider than Inter at the same size, so body drops from 14px to **13px** and tables lose
  roughly one column of breathing room. The column-visibility picker (§7 #7) stops being a nicety and
  becomes load-bearing. Re-check every table at 1280px.
- Uppercase mono looks cramped: any uppercase run gets `letter-spacing: 0.06–0.08em`. Outfit Black caps
  are the opposite — they need *negative* tracking (`-0.02em`) or they look loose.
- Load both from `next/font/google` with `display: 'swap'`, subset `latin`, and only the weights used
  (Outfit 400 + 900, JetBrains Mono 400/500/600). Two families, five weights, self-hosted.

### 3.3b Terminal grammar — the copy conventions

The aesthetic lives in the *strings*, not just the fonts. These are app-wide rules.

| Element | Convention | Example |
|---|---|---|
| Section label above a card or group | `// lower_snake_case`, mono, muted | `// account_health` · `// revenue_by_month` |
| Table column header | `UPPER_SNAKE_CASE` | `LAST_CHECK` · `VALUE_AT_RISK` · `MEMBERSHIP_ID` |
| Button label | `UPPER_SNAKE_CASE`, `→` on the forward-moving one | `IMPORT_CSV →` · `ADD_ACCOUNT` · `REFRESH` |
| Button with a dynamic count | count in parens, never inside the snake | `DELETE_ACCOUNTS (4)` |
| Nav item | `lower_snake_case`; the active item is prefixed `//` in primary | `// account_manager` · `my_listings` |
| Status chip | `UPPER_SNAKE_CASE` | `ACTIVE` · `NEEDS_OTP` · `SOLD_OUT` · `UNDELIVERABLE` |
| Wizard / feature steps | zero-padded index + snake label | `01_upload` · `02_map_columns` · `03_validate` · `04_import` |
| Helper text under a field | `// ` prefix, mono, muted | `// passwords are never stored in your browser` |
| Empty-state title | Outfit Black caps | `NO_ACCOUNTS_YET` |
| Empty-state body | Outfit 400 prose, `// ` prefix optional | |
| Metric label under a KPI | `lower_snake_case`, muted mono | `total_resale_revenue` · `avg_response` |
| Decorative glyphs | `</>`, `{ }`, `[ ]`, `$_` at 4–6% opacity | max **one** per viewport region |

**Guardrails — where the bit stops:**

1. **Never snake_case user data.** Emails, names, club names, fixture titles, venues, notes and CSV
   contents render exactly as they are. `ARSENAL v CHELSEA`, not `arsenal_v_chelsea`.
2. **Never `//`-prefix an error.** Errors, validation messages and confirm dialogs read as plain
   sentences: *"Delete 4 accounts? This cannot be undone."* Style must not cost clarity when something
   has gone wrong.
3. **No uppercase paragraphs.** Outfit Black caps is a headline weight; past five words it stops being
   readable.
4. **One decorative glyph per region, behind nothing.** Never over a data table, never over a form.
5. **A single blinking caret** is allowed — `_` after the dashboard h1 — and it must respect
   `prefers-reduced-motion`. Anywhere else it is noise.

### 3.4 Shape, depth, motion

- **Radii:** `sm 8px` (chips, inputs) · `md 12px` (buttons, menu items) · `lg 14px` (cards, panels) · `xl 20px` (modals) · `full` (avatars, pagination).
- **Depth:** dark mode uses **surface steps, not shadows** (`bg → surface → surfaceRaised`). Light mode uses `shadow-sm` + a 1px border. Modals get one real shadow in both themes.
- **Focus:** `outline: 2px solid var(--brand-primary); outline-offset: 2px` — always visible, never removed.
- **Spacing:** 4px base. Card `p-4` / `p-6`. Toolbar `gap-3`. Table cell `px-4 py-3` (`py-2` in compact density).
- **Motion:** sidebar collapse `300ms ease-in-out`; everything else `150ms`. No spring, no bounce. Respect `prefers-reduced-motion` by dropping to `0ms` for all non-essential transitions.

### 3.5 Chip recipe (used everywhere)

```
rounded-md px-2 py-0.5 text-xs font-medium
dark:  bg-{color}/15  text-{color}       border border-{color}/25
light: bg-{color}/12  text-{colorInk}    border border-{color}/30
```

---

## 4. Information architecture

```
/dashboard                     KPI tiles · revenue chart · account-health strip · activity feed
/accounts                      ★ Account Manager (tabs: Accounts · Proxies · Email/IMAP · OTP Inbox)
/accounts/import               ★ Bulk CSV import wizard (also reachable as a modal)
/mytickets                     Inventory: one row per FIXTURE
/mytickets/fixture/[id]        ★ Fixture detail: seat-level table + context side panel
/mylistings                    Every active listing across all marketplaces
/mylinks                       Shared QR / ticket links handed to buyers        → Coming soon
/fixtures                      Browse upcoming PL fixtures (discovery)          → Coming soon
/onsales                       On-sale / ballot dates per club                  → Coming soon
/insights                      Data insights, ROI, best sellers                 → Coming soon
/salestracker                  Market demand ranking                           → Coming soon
/settings                      General · Preferences · Subscription · API keys
/kitchen-sink                  Every primitive, every state, both themes (dev-only regression page)
```

**Sidebar order** (`w-64`, collapses to a `w-[72px]` icon rail with hover tooltips):

- `Dashboard` — monitor icon
- **Accounts** ▾ → `Account Manager` (key) · `Proxies` (shield) · `Email / IMAP` (mail) · `OTP Inbox` (message-square)
- **Inventory** ▾ → `My Tickets` (ticket) · `My Listings` (list) · `My Links` (link)
- **Fixtures** ▾ → `Fixtures Calendar` (calendar) · `On-Sales` (**clock** — deliberately not a second calendar icon)
- `Insights` (bar-chart) · `Sales Tracker` (clipboard-check)
- Bottom, above a divider: `Settings` (gear) · `Help & Support` (life-buoy + external-link glyph)
- Footer: avatar + username + email (collapses to avatar only)
- Active item: `bg-primary/12`, primary text, primary icon, 1px gradient hairline on top edge
- Below `lg` (1024px): overlay drawer over a scrim

**Topbar** — no background, floats over content, right-aligned: `⌘K` search trigger · theme segment
(two-segment sun|moon pill, active segment filled) · notification bell with popover
(`All · Unread · Success · Issues · Marketplace`, counted tabs, empty state) · avatar menu.

**Page frame** — `h-screen overflow-hidden` shell, each page owns its scroll.
Grammar is identical on every screen: `breadcrumb → h1 → toolbar → data → total + pagination`.

---

## 5. Data model

```ts
// lib/types.ts — shared by mocks, API routes and UI. Single source of truth.

export type ClubId =
  | 'arsenal' | 'aston-villa' | 'bournemouth' | 'brentford' | 'brighton' | 'chelsea'
  | 'crystal-palace' | 'everton' | 'fulham' | 'ipswich' | 'leicester' | 'liverpool'
  | 'man-city' | 'man-utd' | 'newcastle' | 'nottingham-forest' | 'southampton'
  | 'tottenham' | 'west-ham' | 'wolves'

export type ProviderId = 'club-direct' | 'ticketmaster-uk' | 'eventim-uk' | 'seatgeek' | 'stubhub-exchange'
export type Platform   = 'viagogo' | 'stubhub' | 'ticombo' | 'gigsberg' | 'fanpass'
export type Currency   = 'GBP' | 'EUR' | 'USD'

export type MembershipType =
  | 'season-ticket' | 'official-member' | 'digital-member' | 'international-member'
  | 'ticket-exchange' | 'general-sale' | 'hospitality'

export type AccountStatus =
  | 'active'        // logged in, session valid
  | 'needs_login'   // session expired
  | 'needs_otp'     // 2FA challenge pending
  | 'locked'        // club locked the account
  | 'expired'       // membership lapsed
  | 'error'

export interface Account {
  id: string
  email: string
  passwordMasked: string          // API NEVER returns plaintext; UI reveals via a separate endpoint
  club: ClubId
  provider: ProviderId
  membershipId: string            // client reference / supporter number
  membershipType: MembershipType
  memberSince?: string            // ISO
  membershipExpiresAt?: string    // ISO — drives the "expiring" warning chip
  loyaltyPoints?: number
  firstName?: string; lastName?: string; phone?: string; dateOfBirth?: string
  status: AccountStatus
  proxyId?: string
  imapId?: string
  ticketsPurchased: number
  lastCheckedAt?: string
  tags: string[]
  notes?: string
  createdAt: string
}

export interface Fixture {
  id: string
  externalId: string
  homeClub: ClubId
  awayClub: ClubId
  competition: 'premier-league' | 'fa-cup' | 'efl-cup' | 'ucl' | 'uel' | 'friendly'
  matchweek?: number
  kickoff: string                 // ISO
  venue: { name: string; city: string; country: string }
  artworkUrl: string
  provider: ProviderId
  counts: { total: number; listed: number; sold: number; transferred: number }
  blockedPlatforms: Platform[]    // → the "No Viagogo" chips
  faceValueTotal: number
  valueAtRisk: number             // unsold face value — the anxiety column
  currency: Currency
}

export interface Ticket {
  id: string; fixtureId: string
  block: string                   // "North Bank Upper 21"  (was: section)
  levelName: string; row: string; seat: string
  price: number; faceValue: number; currency: Currency
  accountId: string
  visibility: 'visible' | 'hidden'
  status: 'ticket' | 'listed' | 'sold' | 'transferred'
  groupId?: string
  orderId: string
  purchasedAt: string
}

export interface Listing {
  id: string; listingId: string   // marketplace-side id
  platform: Platform; accountId: string
  fixtureId: string; fixtureName: string; kickoff: string
  price: number; currency: Currency
  block: string; rank?: number; quantity: number
  status: 'ACTIVE' | 'INACTIVE' | 'SOLDOUT' | 'PAUSED' | 'UNDELIVERABLE'
  floorPrice?: number
  createdAt: string
}

export interface Proxy {
  id: string; groupId: string; label: string
  host: string; port: number; username: string; passwordMasked: string
  country?: string; status: 'ok' | 'dead' | 'untested'; lastTestedAt?: string; latencyMs?: number
}

export interface KpiSet {
  totalRevenue: number; ticketsSold: number; monthRevenue: number; currency: Currency
  accountsTotal: number; accountsHealthy: number; accountsNeedAction: number
  valueAtRisk: number
}
```

**Seed volumes:** 20 clubs · 64 accounts spread unevenly across clubs · 14 fixtures (mixed matchweeks, two
inside 7 days) · 90 tickets · 26 listings · 18 proxies · 12 months of revenue · 15 activity-feed entries.
Use real stadium data (Emirates, Etihad, Anfield, Old Trafford, Tottenham Hotspur Stadium, London Stadium)
so tables look plausible. Deterministic seeding (fixed seed, no `Math.random()` at request time) so
screenshots are stable.

---

## 6. The placeholder API — and how a backend plugs into it

This is the part that must be got right, because it is the only part that is expensive to change later.

### 6.1 Three layers, one seam

```
  React components
        │  (never fetch directly)
  TanStack Query hooks          lib/api/hooks/useAccounts.ts, useFixtures.ts, …
        │
  Typed API client              lib/api/client.ts   ← THE SEAM
        │  fetch(`${API_BASE_URL}${path}`), Zod-parses every response
        ▼
  API_BASE_URL
        ├─ default  "/api/v1"   → Next.js route handlers in app/api/v1/** returning seeded mock JSON
        └─ real     "https://api.fetch.io/v1"  → your backend, once it exists
```

**The swap is one line in `.env`:**

```env
NEXT_PUBLIC_API_BASE_URL=https://api.fetch.io/v1
```

No component changes, no hook changes. If the backend matches the contract, the app just works. If it
diverges, the Zod schemas fail loudly at the seam with a readable error, instead of rendering `undefined`.

### 6.2 Contract rules the mock routes must obey

- **Base path:** `/api/v1`. Versioned from day one.
- **Envelope:** every response is `{ "data": …, "meta": { … } | null, "error": null }`.
  Errors are `{ "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": {…} } }`.
- **Lists** return `data: T[]` and `meta: { page, pageSize, total, totalPages }`.
- **Query params, identical on every list endpoint:**
  `?page=1&pageSize=25&sort=kickoff&order=asc&q=arsenal&<filterKey>=<value>&<filterKey>=<value>`
  Repeated keys mean OR (`?club=arsenal&club=chelsea`).
- **IDs** are opaque strings. Never assume numeric or sequential.
- **Dates** are ISO-8601 UTC strings. The client formats; the server never does.
- **Money** is an integer of **minor units** (pence) plus a currency code. Never a float.
- **Mutations** return the full updated resource, so the client can replace cache entries wholesale.
- **Auth** is a `Authorization: Bearer <token>` header, injected in one place in `client.ts`. The mock
  ignores it; a real backend does not.
- **Latency:** mock routes sleep 300–600ms so skeleton states are genuinely exercised. Controlled by
  `MOCK_LATENCY_MS`; set to `0` for tests.
- **Failure injection:** `?__fail=500` on any mock route returns an error envelope, so the error state of
  every screen can be demonstrated on demand.

### 6.3 Endpoint list (the backend team's to-do list)

| Method | Path | Purpose |
|---|---|---|
| GET | `/accounts` | list + filter + sort + paginate |
| POST | `/accounts` | create one (manual entry) |
| PATCH | `/accounts/:id` | edit |
| DELETE | `/accounts` | bulk delete `{ ids: [] }` |
| POST | `/accounts/bulk` | **bulk create from parsed CSV rows** → `{ created, skipped, errors[] }` |
| POST | `/accounts/import/validate` | server-side dry run of a parsed CSV → per-row verdicts |
| POST | `/accounts/:id/reveal` | returns plaintext password once, audit-logged |
| POST | `/accounts/:id/login` · `/relogin` · `/reset-password` | maintenance actions |
| GET | `/accounts/stats` | counts by status and by club, for the header strip |
| GET | `/clubs` | reference data for pickers |
| GET | `/fixtures` · `/fixtures/:id` | inventory list + detail |
| GET | `/fixtures/:id/tickets` | seat-level rows |
| POST | `/tickets/group` · `/tickets/list` · `/tickets/transfer` · `/tickets/share` | ticket actions |
| DELETE | `/tickets` | bulk delete |
| GET | `/listings` | list + filter |
| PATCH | `/listings/:id` | inline price edit, status change |
| POST | `/listings/bulk` | activate / deactivate / reprice / delete |
| GET | `/proxies` · POST `/proxies/bulk` · POST `/proxies/:id/test` | proxy manager |
| GET | `/kpis` · `/revenue?groupBy=month` · `/activity` | dashboard |
| GET | `/notifications` · POST `/notifications/read` | bell popover |
| GET | `/search?q=` | ⌘K palette, returns mixed-type results |

Ship this table as `docs/API-CONTRACT.md` plus an OpenAPI 3.1 file generated from the Zod schemas
(`zod-to-openapi`), so the backend can be scaffolded from it directly.

### 6.4 Mutations: optimistic by default

Every mutation hook follows the same shape — optimistic cache update → toast on success →
rollback + error toast on failure. Inline price edit, status toggles and bulk actions all use it.
This is what makes the app feel real while it is still talking to mocks.

---

## 7. Component inventory

Build every one of these **before** any screen, and render them all on `/kitchen-sink`.

| # | Component | shadcn base | Notes |
|---|---|---|---|
| 1 | `AppShell` | — | sidebar + topbar + content slot; collapse state in React state + cookie |
| 2 | `SidebarNav` / `NavGroup` | `Collapsible` + `Tooltip` | active via `usePathname()`; tooltips on the collapsed rail |
| 3 | `ThemeSegment` | `ToggleGroup` | two segments, sun/moon, active segment filled |
| 4 | `NotificationPopover` | `Popover` + `Tabs` | counted tabs, designed empty state |
| 5 | `CommandPalette` | `Command` (cmdk) | `⌘K` over accounts / fixtures / listings / navigation |
| 6 | `StatTile` | `Card` | gradient icon square + big number + label + delta chip; privacy-blur aware |
| 7 | `DataTable` | `Table` + TanStack Table | **the workhorse**: sortable headers, selection column, sticky header, column visibility, density switch, per-page 5/10/25/50/100/200, `Total N` footer, pagination, skeleton/empty/error states, **stacked-card layout under `md`** |
| 8 | `Toolbar` | — | search + filters + right-aligned actions. **`flex-wrap`, never horizontal scroll** |
| 9 | `FilterSelect` | `Select` | outlined, chevron, "All X" default |
| 10 | `ViewOptionsPopover` | `Popover` | grid/table, rows per page, density, sort — segmented rows |
| 11 | `StatusChip` | `Badge` | `ACTIVE` success · `INACTIVE` neutral · `SOLDOUT` danger · `PAUSED` warning · `UNDELIVERABLE` danger-outline · account statuses |
| 12 | `ClubBadge` | `Badge` | crest + club name; `clubs.ts` registry `{id, name, short, crest, primary, stadium}` |
| 13 | `PlatformBadge` | `Badge` | marketplace mark + name; `platforms.ts` registry |
| 14 | `FixtureIdentity` | — | home crest + `HOME v AWAY` + competition + matchweek, first column of every fixture table |
| 15 | `DetailPanel` | `Card` + `Tabs` | right-hand context panel: `Ticket Info / Fixture Info / Seat Map` |
| 16 | `ActionsMenu` | `DropdownMenu` | icon + label + **description line** per item, coloured labels, separated `Danger zone` |
| 17 | `ImportWizard` | `Dialog` + custom stepper | 4 steps — see §9. The single most important non-table component |
| 18 | `CsvDropzone` | — | drag/drop + browse + paste-from-clipboard, file-type and size guard |
| 19 | `ColumnMapper` | `Select` grid | detected header → field, with auto-match confidence and an "ignore" option |
| 20 | `ValidationPreviewTable` | `DataTable` | per-cell error highlight, inline fix, error/warning/ok row counts |
| 21 | `MarketplacePickerModal` | `Dialog` | 2-col tile grid, multi-select, `Auto Listing` / `Auto Delisting` tiles, disabled "Coming soon" tiles |
| 22 | `PasswordCell` | — | masked by default, reveal-on-click, auto-remask after 10s, copy button, never logged |
| 23 | `EmptyState` | — | icon + title + one line + primary CTA. Used constantly — make it good |
| 24 | `ErrorState` | — | icon + what failed + `Retry` |
| 25 | `SkeletonTable` / `SkeletonCard` | `Skeleton` | skeleton-load every table; never a spinner |
| 26 | `ConfirmDialog` | `AlertDialog` | destructive actions, names the count: "Delete 4 accounts?" |
| 27 | `PrivacyToggle` | — | eye icon; blurs every monetary value app-wide via a context + `.money` class |
| 28 | `Money` | — | formats minor-units + currency by locale; participates in privacy blur and the currency normaliser |
| 29 | `RelativeTime` | — | `in 3 days` / `2h ago`, with the red ramp inside 7 days |
| 30 | `Chart` wrappers | Recharts | `LineChart`, `BarChart`, `Sparkline` with a shared dark/light theme object |
| 31 | `Toaster` | `Sonner` | one toast per mutation, with undo where the action is reversible |
| 32 | `Display` / `SectionLabel` / `Prose` / `Mono` | — | the §3.3 type primitives. **No other component sets a font family.** `SectionLabel` renders `// lower_snake` above every card, group and panel |
| 33 | `GlyphMark` | — | decorative `</>` `{ }` `[ ]` `$_` at 4–6% opacity, aria-hidden, one per region, never behind data |

---

## 8. Screen specs

### 8.1 `/dashboard`

Grid `lg:grid-cols-3`, `gap-4`.

- **Row 1 — three `StatTile`s:** `Total Resale Revenue` · `Tickets Sold` · `<Month> Revenue`.
  48px gradient icon square, value `text-3xl font-bold`, label `text-xs text-muted`, MoM delta chip.
- **Row 1.5 — `Account health strip`** (Fetch.io addition, full width): a segmented bar +
  four counters `Active · Needs login · Needs OTP · Locked`, each clicking through to `/accounts` pre-filtered.
  *This is the reason the operator opens the app before an on-sale — it deserves top billing.*
- **Row 2 left (`col-span-2`) — `Revenue by month`** card, sub-label "Monthly resale split",
  top-right segmented toggle `Revenue | Tickets`. Bar chart, £ axis, dotted gridlines.
- **Row 2 right —** gradient promo/onboarding card, then an `Activity` card with tabs
  `Fetch News · Viagogo · Ticombo · StubHub · GigsBerg`; entries are icon + bold title + 2-line clamp + date;
  first entry gets a left primary border + `Last update` chip.
- **Header right:** last-updated timestamp · `Refresh` · **privacy eye** (blurs every monetary value on the page).
- **Empty state:** if there are no accounts, the whole page is replaced by an onboarding card —
  *"Import your first accounts to start tracking."* → `Import accounts` (gradient CTA) + `Add manually`.
  Never show three zeros and a blank chart.

### 8.2 `/accounts` — ★ the anchor screen

**Level 1 tabs:** `Accounts` · `Proxies` · `Email / IMAP` · `OTP Inbox`.
Proxies ships with a working table (read-only + test action); IMAP and OTP Inbox ship as `EmptyState`
with honest copy about what they will do.

**Level 2 (Accounts tab):**

- **Club tabs with counts**, horizontally scrollable, crest + short name + count:
  `All 64 · Arsenal 12 · Man City 8 · Liverpool 9 · Spurs 7 · Man Utd 6 · Chelsea 5 · …`
- **Status filter chips:** `All · Active 51 · Needs login 6 · Needs OTP 3 · Locked 3 · Expired 1`
- **Toolbar (wraps):** `Search by email, name or membership ID` · `Club ▾` · `Membership type ▾` ·
  `Status ▾` · `Tag ▾` · `Columns` · `⊞ view options` · then right-aligned:
  `Check all` (secondary) · `Add account` · **`Import` (primary, gradient)** · `Export`.

**Columns:** select · `ACCOUNT` (avatar initials + email + name under it) · `CLUB` (`ClubBadge`) ·
`MEMBERSHIP` (type chip + client reference in mono) · `LOYALTY` (points, tabular) ·
`TICKETS` (purchased count) · `STATUS` (`StatusChip`) · `PROXY` (label + dot) · `LAST CHECK` (`RelativeTime`) ·
`PASSWORD` (`PasswordCell`, masked) · `ACTIONS` (⋮).

**Row actions menu:** `Login` · `Relogin` (warning) · `Reset password` (warning) · `Test proxy` ·
`Edit` · `Copy credentials` · `View tickets` — *Danger zone* — `Delete`.

**Bulk bar** (appears on selection): `N selected · Check status · Assign proxy · Add tag · Export · Delete`.

**Empty state:** gradient ticket icon, *"No accounts yet"*, *"Import a CSV of your club accounts, or add one
by hand. Fetch.io will keep their sessions alive."*, buttons `Import CSV` (primary) + `Add manually`.

### 8.3 Account import — manual + bulk CSV ★

The flow the whole product hangs on. Available as a full route (`/accounts/import`) **and** as a modal from
the toolbar; both render the same `ImportWizard` component.

**Tab A — Manual entry**

A form dialog, keyboard-first: `Club ▾` (searchable, crest in the option) · `Email` · `Password` ·
`Membership type ▾` · `Client reference` · `First / Last name` · `Phone` · `Loyalty points` ·
`Proxy ▾` (optional) · `Tags` (multi) · `Notes`.
Footer: `Save & add another` (keeps club + membership type, clears identity fields, refocuses email) and `Save`.
Live duplicate check on the email field. Submit disabled until valid; errors inline, never in a toast.

**Tab B — Bulk CSV import — a 4-step stepper**

**Step 1 · Upload**
`CsvDropzone` (drag, browse, or paste rows from the clipboard) · a prominent
**`Download CSV template`** link · accepted formats `.csv, .tsv, .txt` up to 5MB / 5000 rows ·
a short "what we expect" table showing the 6 required and 9 optional columns · delimiter auto-detect
with a manual override · encoding note (UTF-8, BOM tolerated).

Template columns:

```csv
email,password,club,membership_type,membership_id,first_name,last_name,phone,date_of_birth,loyalty_points,proxy,imap_email,imap_password,tags,notes
```

Required: `email`, `password`, `club`. Everything else optional.

**Step 2 · Map columns**
`ColumnMapper`: left = detected CSV header + first 3 sample values; right = a `Select` of Fetch.io fields,
pre-selected by fuzzy auto-match (`Email Address` → `email`, `Club Name` → `club`, `Ref` → `membership_id`)
with a confidence dot. Unmapped columns default to `Ignore`. A banner warns if a required field is unmapped
and the `Continue` button stays disabled. Mapping is remembered per session so re-imports are one click.

**Step 3 · Validate & preview**
Parsed rows in a `ValidationPreviewTable` with three counters at the top:
`✅ 412 ready · ⚠️ 18 warnings · ❌ 7 errors`, and a filter to show only one class.

Validation rules:

| Rule | Class |
|---|---|
| `email` missing or malformed | error |
| `password` missing | error |
| `club` not one of the 20 (with fuzzy suggestion: "Man Utd? did you mean *Manchester United*") | error, one-click fix |
| duplicate email **within the file** | error on the second occurrence |
| duplicate email **against existing accounts** | warning → choose `Skip` / `Update existing` |
| `membership_type` unrecognised | warning → falls back to `official-member` |
| `loyalty_points` not a number | warning → dropped |
| `proxy` string not `host:port:user:pass` | warning → dropped |
| row longer/shorter than the header | warning → padded |

Offending cells are tinted `danger/15` (or `warning/15`) with the reason in a tooltip, and **editable inline** —
fix and the counter updates live. A `Fix all clubs automatically` bulk action applies every high-confidence
fuzzy suggestion at once. `Import N accounts` is disabled while any error remains, and its label always
carries the exact count.

**Step 4 · Result**
A progress bar during the (mock) commit, then a summary: `403 imported · 9 updated · 18 skipped`,
a `Download error report (CSV)` button containing only the failed rows plus a `_error` column, and
`Go to accounts` / `Import another file`. Toast on completion. If the user closes the wizard mid-import,
warn first.

**Non-negotiables:** parsing happens in a **web worker** (`papaparse` with `worker: true`) so 5000 rows never
freeze the UI; passwords are never written to `localStorage`, never logged to the console, and are masked in
every preview cell.

### 8.4 `/mytickets` — inventory, one row per fixture

**Toolbar:** `Search fixtures` · `Upcoming only ▾` (All / Past / Upcoming) · `Club ▾` · `Competition ▾` ·
`Account ▾` · `Filters` popover · `⊞` view options · `Refresh` (primary) · `Import` · `Export`.

**Columns:** `FIXTURE` (`FixtureIdentity`) · `KICKOFF` (dd/MM/yyyy HH:mm + `in N days`, sortable, default asc,
**red ramp inside 7 days**) · `VENUE` (name + city muted) · `COMPETITION` · `TOTAL` (primary) ·
`LISTED` (success) · `SOLD` (violet) · `TRANSFERRED` (warning ring-chip) · **`VALUE AT RISK`** (unsold face
value, right-aligned, muted→danger ramp as kickoff approaches).

Row click → fixture detail. Footer `Total 14 fixtures` + pagination. Grid view = the same data as cards.

### 8.5 `/mytickets/fixture/[id]` — ★ the core screen

**Breadcrumb:** `My Tickets / Arsenal v Chelsea — 14 Sep 2026`. `h1` = the fixture, not "My Tickets".

**Fixture header:** 72px artwork (home crest) · `h1` `ARSENAL v CHELSEA` · kickoff `text-lg` ·
`Emirates Stadium — London, England` muted · competition + matchweek chips · blocked-platform chips
(`No Viagogo` in danger tint, **with a tooltip spelling out "This fixture cannot be resold on Viagogo"**) ·
right side: `Value at risk` figure + privacy eye.

**Layout:** ≥1280px → left ~64% ticket table, right ~36% context panel, both `rounded-lg` cards.
Below 1280px → panel stacks under the table (never clipped).

**Left toolbar (wraps to two rows):**
row 1 `Search` · `Finance (N)` · `Auto Group` toggle · `Actions` (enabled only with a selection) ·
`Reset PW` (warning) · `Relogin` (warning) · `Refresh` (primary);
row 2 `All accounts ▾` · `All blocks ▾` · `All rows ▾`.

**Ticket columns:** select · `BLOCK` · `LEVEL` · `ROW` · `SEAT` · `PRICE` · `FACE` · `ACCOUNT` (muted email) ·
`VISIBILITY` (eye toggle) · `STATUS` chip.

**`Actions` menu — reproduce exactly, each item icon + label + description:**

| Label | Description | Colour |
|---|---|---|
| Group (N) | Create or merge a group | default |
| List | Create a new listing | primary |
| Associate listing | Link a supported listing or record one manually | success |
| Edit | Edit ticket details | default |
| Transfer | Transfer ticket to another user | primary |
| Resell at face value | Resell at face value (club exchange) | success |
| Download PDF | Download PDF tickets | violet |
| Download wallet pass | Apple / Google Wallet pass | violet |
| Public | Make ticket public | primary |
| Share | Share tickets with a QR code | primary |
| *— Danger zone —* | | |
| Delete | Delete selected tickets | danger — `ConfirmDialog` naming the count |

`List` → `MarketplacePickerModal` ("Select a marketplace": Viagogo, StubHub, Ticombo, GigsBerg,
+ `Auto Listing` / `Auto Delisting` tiles, + disabled `Coming soon` tiles — **never a literal `secret` string**).

**Right panel `Ticket Info`:** empty → centred *"Select a ticket in the table"*.
Selected → summary card (artwork, `N tickets selected`, `1 group • purchased 12 Mar`, green total chip,
mono `Order ID`), then one card per lot (`North Bank Upper 21 • Row 14`, `4 tickets` chip, mono
`Seats 43–46 (4)`, mono `Order ID`), then a footer `Total value` (success) + `Average price`.

**Tab `Fixture Info`:** comparable-sales lookup — `Block ▾` `Currency ▾` `Qty` in a proper 2-column grid +
search, results as `Live prices` and `Recent sales` lists that fill the panel height.

**Tab `Seat Map`:** stadium map; `EmptyState` "Map unavailable" when absent.

### 8.6 `/mylistings`

**Toolbar:** `Search` · `Platform ▾` · `Account ▾` · `Status ▾` · `Columns (11)` ·
platform toggle-chip row (`Viagogo · StubHub · GigsBerg · Ticombo`, each with its brand dot) ·
**currency normaliser** `Show in: GBP ▾` with an `Original` option.

**Columns:** select · `PLATFORM` · `ACCOUNT` · `FIXTURE` (name + kickoff under it) · `KICKOFF` ·
`LISTING ID` (mono) · `PRICE` (**inline editable** — click, input, Enter commits, optimistic + toast + rollback) ·
`BLOCK` · `RANK` · `QTY` · `STATUS` · `⋮`.

Above: `Total 26 listings` + rows-per-page. Below: `0 of 26 selected` + pagination.
Bulk bar: `Activate · Deactivate · Reprice · Delete`.

### 8.7 `/settings`

`General` (name, avatar) · `Preferences` (**one locale + one timezone + one display currency — the single
source for every date and money format in the app**, density, default rows per page, reduced motion) ·
`Subscription` (static) · `API` (base URL display + token field — the visible seam to the future backend).

---

## 9. UX rules carried over from the audit

**Keep** (these are what the source app got right): event→ticket drill-down; table + persistent context
panel instead of a modal; selection-driven action surface with counts in the labels; descriptions inside
dropdown items; semantic and consistent colour; identical page grammar everywhere; filters above the data,
not in a drawer; genuine dual theme with a segmented control; the privacy blur; tooltips on the collapsed
rail; empty states that carry a next action; skeleton loading; high data density.

**Fix** (every one of these is an acceptance criterion):

| # | Rule |
|---|---|
| 1 | Toolbars **wrap**. No control bar ever scrolls horizontally, at any width. |
| 2 | The two-pane split is responsive: side-by-side ≥1280px, stacked below. Nothing clipped. |
| 3 | Tables get a column-visibility picker on **every** screen, a frozen first column, and a stacked-card layout under `md`. |
| 4 | No two nav icons look alike (On-Sales gets a clock, not a second calendar). |
| 5 | No placeholder strings shipped — no `lorem`, no `secret`, no `jj/mm/aaaa`. |
| 6 | One date formatter, one number formatter, both driven by the Preferences locale. |
| 7 | Currency normaliser on any column that can hold mixed currencies. |
| 8 | Muted text ≥4.5:1 in both themes. Verified with a script, not by eye. |
| 9 | Breadcrumb + correct `h1` on every detail page. |
| 10 | Every domain flag chip has a tooltip in plain English. |
| 11 | Destructive actions are separated **and** confirmed, with the count in the dialog title. |
| 12 | The import flow has a template, a mapping step, per-row validation and a disabled submit. |
| 13 | Passwords masked everywhere, revealed only on explicit click. |
| 14 | `⌘K` command palette over accounts, fixtures, listings and navigation. |
| 15 | The dashboard has a real onboarding state for zero data. |
| 16 | Every mutation: optimistic update + toast + rollback on error. |
| 17 | Works on a phone. The "did anything sell / is anything locked" check must be usable at 375px. |

---

## 10. Build order — 12 parts, one Claude Code prompt each

Each part is a stopping point with something visible to review. Prompts are in
`FETCH-IO-CLAUDE-CODE-PROMPTS.md`.

| Part | What | Review gate |
|---|---|---|
| 0 | Repo scaffold, deps, folder structure, lint/format, CI-less quality gates | `npm run dev` boots |
| 1 | Design tokens, both themes, `AppShell`, sidebar, topbar, theme segment, notification popover | Shell in both themes |
| 2 | Primitive library + `/kitchen-sink` | Every primitive, every state, both themes |
| 3 | Types, Zod schemas, seed data, mock route handlers, typed client, Query hooks, `docs/API-CONTRACT.md` | `curl /api/v1/accounts` returns a valid envelope |
| 4 | `/accounts` — Account Manager tab, club tabs, filters, table, bulk bar, row actions, `PasswordCell` | The screen, with 64 seeded accounts |
| 5 | **Account import** — manual entry + the 4-step CSV wizard, worker parsing, validation, error report | Import a messy 500-row CSV end to end |
| 6 | `/mytickets` | Fixture list with value-at-risk and the countdown ramp |
| 7 | `/mytickets/fixture/[id]` — the two-pane core screen | Select rows, open every Actions item |
| 8 | `/mylistings` — inline price edit, column picker, bulk bar, currency normaliser | Edit a price, see the toast |
| 9 | `/dashboard` — KPI tiles, account-health strip, chart, feed, privacy blur, onboarding state | Both the populated and the zero state |
| 10 | Remaining routes as honest "Coming soon", `/settings`, `⌘K` palette | Nav is never dead |
| 11 | Polish & verification — a11y, keyboard paths, mobile card layouts, contrast script, error/empty/loading audit, `docs/BACKEND-HANDOFF.md` | Acceptance checklist green |

---

## 11. Acceptance criteria

- [x] Both themes pass **4.5:1** on all text including muted copy and chip text — verified by `scripts/check-contrast.ts`, which parses app/globals.css, checks 76 pairs and exits non-zero inside `npm run check`. Five ink tokens moved in Part 11 to clear chips sitting on `surface-raised`.
- [ ] No horizontal scrollbar on any toolbar at 375 / 768 / 1280 / 1440 / 1920.
- [ ] Every table is usable at 375px (stacked cards) and 1920px (no dead whitespace).
- [ ] Every icon-only control has an accessible name and a tooltip.
- [ ] Full keyboard path: tab to a table, arrow through rows, `space` to select, `enter` to open detail, `esc` to close, `⌘K` from anywhere.
- [ ] Every list has four designed states: loading (skeleton), empty (icon + copy + CTA), error (retry), populated.
- [ ] Every mutation shows a toast; every destructive one shows a confirm naming the affected count.
- [ ] A 500-row CSV with deliberate mistakes imports cleanly: errors caught, fuzzy club fixes offered, error report downloadable.
- [ ] Passwords are masked in every view, absent from `localStorage`, absent from console output.
- [ ] No placeholder strings, no `lorem`, no untranslated date masks, no dead nav items.
- [ ] Two font families only (Outfit, JetBrains Mono). No component sets a font family outside the §3.3 type primitives.
- [ ] Ligatures are off everywhere except `<pre>` and the CSV preview — no data cell renders `->` as a glyph.
- [ ] Every chrome label follows §3.3b; **no user data is snake_cased** and no error message is `//`-prefixed.
- [ ] Every table still fits at 1280px with mono's extra width, without dropping below 13px body type.
- [ ] `/kitchen-sink` renders every component in every variant in both themes and is visually clean.
- [ ] Changing `NEXT_PUBLIC_API_BASE_URL` is the **only** change needed to point at a real backend — proven by pointing it at a stub server.
- [ ] Lighthouse a11y ≥ 95 on `/accounts` and `/mytickets/fixture/[id]`.

---

## 12. Repo structure

```
fetch-io/
├─ app/
│  ├─ (app)/                    # authenticated shell group
│  │  ├─ layout.tsx             # AppShell
│  │  ├─ dashboard/page.tsx
│  │  ├─ accounts/page.tsx
│  │  ├─ accounts/import/page.tsx
│  │  ├─ mytickets/page.tsx
│  │  ├─ mytickets/fixture/[id]/page.tsx
│  │  ├─ mylistings/page.tsx
│  │  ├─ settings/page.tsx
│  │  └─ (soon)/…               # coming-soon routes
│  ├─ api/v1/**/route.ts        # ← mock backend; delete or bypass when the real one lands
│  ├─ kitchen-sink/page.tsx
│  ├─ layout.tsx
│  └─ globals.css               # CSS variables for both themes
├─ components/
│  ├─ ui/                       # shadcn primitives (generated)
│  ├─ shell/                    # AppShell, SidebarNav, Topbar, ThemeSegment, CommandPalette
│  ├─ data/                     # DataTable, Toolbar, FilterSelect, ViewOptions, states
│  ├─ domain/                   # ClubBadge, PlatformBadge, FixtureIdentity, StatusChip, PasswordCell, Money
│  └─ import/                   # ImportWizard, CsvDropzone, ColumnMapper, ValidationPreviewTable
├─ lib/
│  ├─ types.ts
│  ├─ api/{client.ts,schemas.ts,endpoints.ts,hooks/*}
│  ├─ mock/{seed.ts,clubs.ts,fixtures.ts,accounts.ts,…}
│  ├─ csv/{parse.worker.ts,mapping.ts,validate.ts,template.ts}
│  ├─ format/{money.ts,date.ts,locale.ts}
│  └─ registries/{clubs.ts,platforms.ts,providers.ts}
├─ docs/{API-CONTRACT.md,BACKEND-HANDOFF.md,DESIGN-TOKENS.md,openapi.json}
├─ public/crests/*.svg
├─ scripts/check-contrast.ts
└─ .env.example                 # NEXT_PUBLIC_API_BASE_URL=/api/v1
```

---

## 13. Risks & decisions to revisit

| Risk | Mitigation |
|---|---|
| Club crests are trademarked | Ship neutral generated crest placeholders (initials on the club's primary colour) in `public/crests/`. Swap for licensed assets later; the registry makes it a one-file change. |
| Storing club passwords in a browser app at all | The frontend never persists them. They exist in memory during import and are POSTed once. Say so in `BACKEND-HANDOFF.md` — the real backend must encrypt at rest. |
| 5000-row CSV performance | Web-worker parsing + virtualised preview table (`@tanstack/react-virtual`) above 200 rows. |
| Mock and real backend drifting apart | Zod schemas are the contract; OpenAPI is generated from them; the client parses every response, so drift fails loudly and immediately. |
| Scope creep into Insights / Sales Tracker | They stay `Coming soon` until the five screens pass acceptance. |
