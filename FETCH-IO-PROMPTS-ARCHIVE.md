# Fetch.io — prompts archivés (parties terminées)

Conservé pour référence : ce qui a déjà tourné, dans l'ordre d'exécution.
Le fichier actif est `FETCH-IO-CLAUDE-CODE-PROMPTS.md`.

---

## One-time GitHub setup — run this once, before the next part

The repo to push is the **Fetch folder only**. A separate, unrelated git repo sits one level up at
`Documents\1`; nothing in this project should ever touch it. Paste this into Claude Code once:

```
This repo pushes to https://github.com/Tom-wine/Fetch.git. Set it up, once.

1. Confirm you are in the right repo. `git rev-parse --show-toplevel` must print the Fetch folder,
   NOT Documents\1 — there is a separate, unrelated repo one level up. If it prints anything else,
   stop and tell me. Never run a git command from Documents\1.

2. Untrack the two files that were committed by accident and must not reach GitHub:
     git rm -r --cached _to_delete
     git rm --cached mitm_mcp_traffic.db
   Delete the _to_delete folder from disk. Leave the .db on disk if another tool owns it — just stop
   tracking it.

3. Append to .gitignore:
     _to_delete/
     mitm_mcp_traffic.db
     .claude/
   (Drop the .claude/ line if you consider that folder shared project config rather than local settings.)

4. Confirm nothing sensitive is tracked: `git ls-files | grep -i env` must show only .env.example.

5. Commit the cleanup:
     git add .gitignore
     git commit -m "chore: untrack local artefacts, extend gitignore"

6. Rename the branch to match GitHub's default and add the remote:
     git branch -M main
     git remote add origin https://github.com/Tom-wine/Fetch.git

7. If the GitHub repo was created with a README or licence it already has a commit, so reconcile
   first: `git pull --rebase origin main`. If it is empty, skip this.

8. Push: `git push -u origin main`

Report the remote URL, the branch name, the pushed SHA, and the output of `git status` (which must
be clean).
```

Authentication: if the push prompts for a password, GitHub no longer accepts one — use
`gh auth login`, or a personal access token as the password.

From here every part ends with a push, and the per-part instructions assume `origin` and `main` exist.

---

## Part 0 — Scaffold

```
Read FETCH-IO-BUILD-PLAN.md end to end, then scaffold the project.

Create a Next.js 15 App Router project in this directory with TypeScript (strict), Tailwind CSS,
ESLint and Prettier. Then:

1. Install and configure: shadcn/ui (style: default, base colour: slate, CSS variables: yes),
   @tanstack/react-table, @tanstack/react-query, @tanstack/react-virtual, recharts, zod, next-themes,
   lucide-react, sonner, cmdk, papaparse (+ @types/papaparse), date-fns, clsx, tailwind-merge, class-variance-authority.
2. Create the exact folder structure from §12 of the plan, with .gitkeep files where a folder is
   still empty. Do not create placeholder components yet.
3. Add .env.example containing:
     NEXT_PUBLIC_API_BASE_URL=/api/v1
     MOCK_LATENCY_MS=400
   and .env.local with the same values.
4. Add npm scripts: dev, build, start, lint, typecheck, format, check (= lint + typecheck).
5. Set up the root layout with Outfit (weights 400 + 900) and JetBrains Mono (400/500/600) from
   next/font/google, exposed as --font-display / --font-prose and --font-mono (see plan §3.3;
   mono is the DEFAULT body font, not just for code), a ThemeProvider (next-themes, attribute="class",
   defaultTheme="dark", enableSystem=false), a QueryClientProvider, and the sonner Toaster.
6. Write a short README.md: what Fetch.io is, how to run it, and a pointer to the plan.

Do not build any UI beyond an empty page that says "Fetch.io". Run `npm run check` and `npm run dev`
to prove it boots, then stop and show me the file tree and package.json.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 1 — Design tokens, both themes, and the app shell

```
Read FETCH-IO-BUILD-PLAN.md §3 (brand & tokens), §3.3 + §3.3b (mono-first typography and the terminal
copy grammar — read these twice, they define the whole feel of the product) and §4 (information architecture).

0. FONT RETROFIT — do this first if Part 0 was run with the earlier Inter-based instruction.
   In app/layout.tsx, remove the Inter next/font import and its Inter-specific
   font-feature-settings ('cv02','cv03','cv04','cv11'), and replace them with:
     import { Outfit, JetBrains_Mono } from 'next/font/google'
     const display = Outfit({ subsets:['latin'], weight:['400','900'], variable:'--font-display', display:'swap' })
     const mono    = JetBrains_Mono({ subsets:['latin'], weight:['400','500','600'], variable:'--font-mono', display:'swap' })
   Put both variables on <html> and set the body class to the mono font — mono is the DEFAULT UI font.
   Then grep for "Inter" across the repo and remove every remaining reference (layout, globals.css,
   any shadcn-generated --font-sans). Everything else Part 0 produced stays as-is.

Implement the design system and the app shell. Use the EXACT hex values from §3.1 — do not
substitute Tailwind defaults, do not round, do not "improve" them.

This project is on Tailwind v4, which is CSS-first: there is no tailwind.config.ts, and everything
below lives in app/globals.css. Replace the placeholder slate tokens that shadcn's registry left there.

1. app/globals.css — the token layer, in this exact order:
   a. `@import "tailwindcss";` then `@import "tw-animate-css";`
   b. `@custom-variant dark (&:is(.dark *));` so the class strategy works in v4.
   c. `:root { … }` holding the LIGHT values from §3.1 as raw variables (--bg, --surface,
      --surface-raised, --surface-hover, --border, --border-strong, --text, --text-muted,
      --text-faint, --primary, --primary-solid, --primary-hover, --primary-press, --primary-ink,
      --cyan, --deep, --success, --warning, --danger, --violet, --neutral-chip), then
      `.dark { … }` overriding every one with the DARK values. Keep the shadcn semantic aliases
      (--background, --foreground, --card, --popover, --muted, --accent, --destructive, --input,
      --ring, --radius…) but point them AT the Fetch tokens so any shadcn component we generate later
      is on-brand automatically — e.g. --background: var(--bg); --ring: var(--primary).
   d. `@theme inline { … }` mapping them to Tailwind's namespaces so utilities are generated and
      stay theme-switchable: --color-bg, --color-surface, --color-surface-raised, --color-border,
      --color-text, --color-muted, --color-faint, --color-primary, --color-primary-solid,
      --color-success, --color-warning, --color-danger, --color-violet, --color-cyan
      → giving bg-surface, text-muted, border-border, bg-primary-solid, text-success, and the
      slash-opacity forms (bg-primary/12, bg-success/15) that the §3.5 chip recipe needs.
      Also set --radius-sm 8px, --radius-md 12px, --radius-lg 14px, --radius-xl 20px, and the fonts:
      --font-mono (JetBrains Mono — this is the DEFAULT, so also set --font-sans to it so any
      unstyled element lands on mono), --font-display (Outfit, used at weight 900 uppercase only),
      --font-prose (Outfit 400). Add the §3.3 type scale as --text-* entries.
   e. `@utility bg-fetch-gradient { background-image: linear-gradient(135deg,#0057C8 0%,#1A8CF0 48%,#6FD3FA 100%) }`
      and `@utility shadow-fetch-glow { box-shadow: 0 0 24px -4px rgb(26 140 240 / .55) }`
      (v4 replaces the plugin API with @utility).
   f. `@layer base`: dark is the default; `body { font-family: var(--font-mono) }` — mono is the
      default UI font, so an unstyled element must land on mono, not sans;
      `font-variant-ligatures: none` globally, re-enabled only inside `pre` and `.csv-preview`
      (JetBrains Mono otherwise turns `->` and `!=` into glyphs and corrupts data cells);
      a `.money` class plus `[data-privacy="on"] .money { filter: blur(6px); user-select: none }`;
      a global `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px }`;
      and a `@media (prefers-reduced-motion: reduce)` block killing non-essential transitions.
   Every hex in the app lives in this file and nowhere else.
2. Typography primitives in components/ui/typography.tsx — nothing else in the app sets a font family:
   - `<Display>` — Outfit 900, uppercase, tracking -0.02em. Props: `as` (h1/h2), `size`.
   - `<SectionLabel>` — renders `// lower_snake_case` in mono 11px muted, tracking 0.08em. Takes a
     plain string and snake_cases it. Goes above every card, group and panel.
   - `<Prose>` — Outfit 400, 14px, line-height 1.6. The ONLY component allowed to render multi-line
     prose (dropdown descriptions, empty-state bodies, error explanations).
   - `<Mono>` / default — everything else. Plus a `snake()` helper in lib/format/text.ts for
     UPPER_SNAKE labels and `// ` prefixes, so the grammar is applied in one place, never by hand.
   Enforce §3.3b's guardrails in code: `snake()` is for chrome strings only — add a JSDoc warning that
   user data (emails, names, club names, fixtures, venues, notes) is NEVER passed through it.
3. Sanity-check the token layer before building anything on it: render a temporary page showing every
   token as a swatch plus the full §3.3 type scale specimen in both themes, confirm the slash-opacity
   chip forms compile, then delete it (the real version is /kitchen-sink in Part 2).
4. Build the shell in components/shell/:
   - AppShell: h-screen overflow-hidden, sidebar + topbar + scrollable content slot.
   - SidebarNav: w-64, collapses to w-[72px] icon rail (300ms ease-in-out), the exact nav tree and icons
     from §4 including the two collapsible groups, tooltips on the collapsed rail, and the
     avatar/username/email footer. Nav labels are `lower_snake_case` mono 13px
     (`account_manager`, `my_tickets`, `my_listings`); group headers are `// inventory`, `// accounts`,
     `// fixtures` via SectionLabel. Active item (usePathname()): a `//` prefix in primary,
     bg-primary/12, primary text and icon, and a 1px gradient hairline on the top edge.
     The logo is the gradient mark + "FETCH.IO" wordmark in Outfit 900 uppercase, tracking -0.02em.
     Below lg it becomes an overlay drawer over a scrim. Collapse state persists in a cookie.
   - Topbar: floating, right-aligned — a ⌘K trigger button (non-functional for now), ThemeSegment
     (two-segment sun|moon ToggleGroup, filled active segment — NOT a single toggle),
     NotificationPopover (header "Notifications / You're all caught up", "Mark all read" link,
     counted tabs All · Unread · Success · Issues · Marketplace, list or empty state — static data
     for now), and an avatar DropdownMenu.
   - PageHeader: optional breadcrumb (mono, `/` separators), h1 via `<Display>` (Outfit 900, 28px,
     uppercase), optional `// subtitle` SectionLabel, optional right-side action slot.
     On /dashboard only, the h1 gets a single blinking `_` caret that respects prefers-reduced-motion.
   - Buttons: mono 600, 12px, UPPER_SNAKE, tracking 0.06em; the forward/primary action carries a
     trailing `→` (`IMPORT_CSV →`). Dynamic counts go in parens outside the snake: `DELETE_ACCOUNTS (4)`.
5. Create route stubs for every path in §4 so nothing 404s; each renders a PageHeader plus a
   centred "Coming soon" placeholder for now.
6. Decorative glyph layer: a `<GlyphMark>` component rendering `</>`, `{ }`, `[ ]` or `$_` at 4–6%
   opacity, absolutely positioned, aria-hidden, pointer-events-none. Max ONE per viewport region and
   never behind a data table or a form — enforce that by only using it in the shell's empty content
   area and on empty states.
7. Write docs/DESIGN-TOKENS.md: the palette table, the gradient rules (§3.2 — list the five allowed
   uses), the §3.3 type scale, the §3.3b terminal grammar table including the guardrails, radii, motion.

Stop and show me the shell at /dashboard in both dark and light, at 1440px and at 375px, plus a
screenshot of the type specimen so I can judge the Outfit Black / JetBrains Mono pairing.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 2 — Primitive component library + /kitchen-sink

```
Read FETCH-IO-BUILD-PLAN.md §7 (component inventory), §9 (UX rules) and §3.3b (terminal copy grammar).

REPO STATE — Part 1 is done and audited. Do NOT rebuild any of it:
- app/globals.css holds the full token layer (raw tokens in :root/.dark, @theme inline mapping,
  @utility gradient + glow, base layer with mono default, ligatures off, focus ring, .money privacy
  blur, caret keyframes, reduced-motion). Add to it; do not restructure it.
- components/ui/typography.tsx already exports Display / SectionLabel / Prose / Mono, and
  lib/format/text.ts already exports snake / upperSnake / comment / withCount / step. USE THEM.
  No component may set a font family or hand-roll a snake_case label.
- The shell is built: AppShell, SidebarNav, Topbar, ThemeSegment, NotificationPopover, PageHeader,
  Logo, GlyphMark, ComingSoon, nav-config.ts. Route stubs exist for every path in §4.
- These shadcn primitives are already generated: button, tabs, tooltip, popover, dropdown-menu,
  collapsible, avatar, scroll-area, separator, sheet, toggle, toggle-group.
- `npm run typecheck` currently exits 0. It must still exit 0 when you finish.

Housekeeping first, before writing any component:
- `git init && git add -A && git commit -m "part 1: tokens, typography, shell"` — this repo has no
  version control yet and every part from here rewrites large files.
- Delete the stray `mitm_mcp_traffic.db` in the project root; it is not part of this project.

Two traps to avoid:
1. @tanstack/react-table is v9.1.2, a major version ahead of the v8 that most examples use. Before
   writing DataTable, read the installed types in node_modules/@tanstack/react-table/dist/**/*.d.ts
   and build against what is actually there. Do not write v8 API from memory.
2. `--color-muted` in our token layer is the muted TEXT colour, whereas stock shadcn components expect
   `bg-muted` to be a muted SURFACE. After every `npm run ui -- <name>`, grep the generated file for
   `bg-muted` and swap it to `bg-surface-raised`. (Part 1 already did this for tabs and toggle.)

Build the reusable primitives. No screens yet. Every one is typed, themed, keyboard-accessible,
and rendered on /kitchen-sink in every variant and state.

Typography rules apply to every component below, via the Part 1 primitives — no component sets a font
family itself: table headers are UPPER_SNAKE mono 11/600 tracking 0.08em; buttons UPPER_SNAKE mono
12/600 with a trailing → on the forward action; chips UPPERCASE mono 11/500; every card and panel is
introduced by a `// section_label`; body and cells are mono 13px; anything past two lines is <Prose>
in Outfit 400. Because mono is ~12% wider than a proportional face, verify every table at 1280px —
if columns crowd, reduce default visible columns rather than shrinking type below 13px.

Data components (components/data/):
- DataTable — the workhorse, on TanStack Table. Generic over the row type. Must support:
  sortable headers, a selection checkbox column with an indeterminate header state, sticky header,
  row hover, click-to-open with an onRowClick prop, column visibility picker, density switch
  (comfortable/compact), rows-per-page selector (5/10/25/50/100/200), a "Total N <noun>" footer,
  pagination, a frozen first column, and — under md — a stacked-card layout instead of a horizontal
  scroll. It renders its own loading (skeleton rows), empty and error states via props.
- Toolbar — flex-wrap container: search input · filter slot · right-aligned action slot.
  It must WRAP onto a second row, never scroll horizontally. Prove this at 1280px in the kitchen sink.
- FilterSelect, ViewOptionsPopover, BulkActionBar (appears on selection, shows "N selected"),
  SkeletonTable, SkeletonCard, EmptyState (icon + title + one line + primary CTA),
  ErrorState (icon + message + Retry).

Domain components (components/domain/):
- StatusChip using the §3.5 chip recipe, with variants for both listing statuses
  (ACTIVE/INACTIVE/SOLDOUT/PAUSED/UNDELIVERABLE) and account statuses
  (active/needs_login/needs_otp/locked/expired/error).
- ClubBadge + lib/registries/clubs.ts — all 20 Premier League clubs with {id, name, short, stadium,
  city, primaryColor}. Generate neutral SVG crest placeholders (club initials on the club's primary
  colour) into public/crests/ — do not use real club crests.
- PlatformBadge + lib/registries/platforms.ts (viagogo, stubhub, ticombo, gigsberg, fanpass) and
  providers.ts (club-direct, ticketmaster-uk, eventim-uk, seatgeek, stubhub-exchange).
- FixtureIdentity (home crest + "HOME v AWAY" + competition + matchweek).
- StatTile (48px gradient icon square, big number, label, delta chip, privacy-aware).
- PasswordCell (masked by default, reveal on click, auto-remask after 10s, copy button; never logs).
- Money (takes minor units + currency, formats via lib/format, carries the .money class),
  RelativeTime ("in 3 days" / "2h ago", danger colour inside 7 days).
- ActionsMenu (DropdownMenu where each item is icon + label + a muted description line, supports
  coloured labels and a separated "Danger zone" section), ConfirmDialog (AlertDialog, title names
  the affected count), PrivacyToggle (context provider + eye button, sets data-privacy on <html>).
- Chart wrappers on Recharts (LineChart, BarChart, Sparkline) sharing one theme object that reads
  the CSS variables so charts follow the theme.

Also build lib/format/ alongside the existing text.ts: money.ts, date.ts, locale.ts — ONE date
formatter and ONE number formatter, both driven by a single locale/timezone/currency setting held in
a LocaleProvider (mount it in app/providers.tsx next to the existing providers). Money is handled as
integer MINOR UNITS plus a currency code throughout — never a float — because that is the API
contract Part 3 implements. Nothing anywhere else in the app may format a date or a number.

Then rebuild /kitchen-sink for real — it is currently a stub. Every primitive, every variant, every
state (loading, empty, error, populated, selected, disabled), grouped under `// section_label`
headers, with a theme toggle at the top and a typography specimen section (the §3.3 scale, plus the
§3.3b grammar examples side by side with their guardrail counter-examples — `ARSENAL v CHELSEA`
correct vs `arsenal_v_chelsea` wrong). This page is the regression check for every part that follows.

Definition of done, verify each before stopping:
- `npm run typecheck` and `npm run lint` both exit 0.
- /kitchen-sink renders every primitive in both themes with no console errors.
- The DataTable demo is checked at 1280px, 768px and 375px: the toolbar wraps rather than scrolling,
  the table falls back to stacked cards under md, and no column is clipped. If columns crowd at
  1280px, hide columns by default rather than dropping type below 13px.
- Keyboard: the table is reachable by tab, arrows move between rows, space toggles selection.
- No component sets a font family; no user-data string is passed through snake()/upperSnake().

Stop and show me /kitchen-sink in both themes, plus the DataTable at 1280px and 375px.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 3 — Types, mock backend, typed client, query hooks

```
Read FETCH-IO-BUILD-PLAN.md §5 (data model) and §6 (the placeholder API). §6 is the most important
section in the plan — the whole point is that attaching a real backend later costs one env var.

REPO STATE — Parts 1 and 2 are done, committed (e977007, d6be2d7) and audited. Do NOT rebuild them.
This part adds the data layer UNDER the existing primitives; it must not touch a component's markup.
What already exists and what it expects from you:
- components/data/DataTable.tsx takes `loading`, `error: string | null`, `onRetry`, `empty`,
  `getRowId: (row) => string`. Your list hooks must expose exactly that shape — isPending → loading,
  error.message → error, refetch → onRetry. Do not invent a second loading convention.
- lib/format/money.ts defines `MoneyValue { amount: number; currency: Currency }` where `amount` is
  INTEGER MINOR UNITS. The API keeps the §5 flat shape (`price: number` + `currency: Currency`), also
  in minor units; components compose `{ amount: price, currency }` at the boundary. Do not change
  either side to match the other — the seam is deliberate.
- components/domain/PasswordCell.tsx takes `onReveal?: () => Promise<string>` and stays disabled
  without it. Give it a real hook backed by POST /accounts/:id/reveal.
- lib/registries/{clubs,platforms,providers}.ts already hold the reference data and 20 crests exist
  in public/crests/. The seed must use those exact ids — do not duplicate the registries in lib/mock.
- lib/format/{date,locale,money,text}.ts and LocaleProvider are the only formatters. API responses
  carry raw ISO strings and integer minor units; never a pre-formatted string.

Three environment facts to build against:
1. Zod installed here is v4. Use its native `z.toJSONSchema()` for docs/openapi.json — do NOT install
   zod-to-openapi or any v3-era companion package.
2. `npm run ui -- <name> --overwrite` will clobber the customised Button. If you must regenerate a
   shadcn primitive, check `git diff` afterwards and restore anything hand-tuned.
3. Seeded timestamps that must read as past (lastCheckedAt, purchasedAt, createdAt) are computed as
   offsets from server start, not hardcoded dates — a "last checked" that lands in the future is a
   bug. Timestamps that must read as future (kickoff) stay fixed relative to that same anchor.

1. lib/types.ts — every interface and union from §5, verbatim.
2. lib/api/schemas.ts — a Zod schema for each type, plus envelope helpers:
   ok<T>(schema) => { data: T, meta: Meta | null, error: null } and the error envelope.
   The Zod schemas are the contract; the TS types are inferred from them where possible.
3. lib/mock/ — deterministic seed data (fixed seed, no Math.random at request time):
   20 clubs, 64 accounts spread unevenly across clubs and covering every AccountStatus,
   14 fixtures (mixed competitions and matchweeks, two inside the next 7 days),
   90 tickets, 26 listings (mixed GBP/EUR so the currency normaliser has something to do),
   18 proxies, 12 months of revenue, 15 activity entries, 8 notifications.
   Real stadium data. Money is stored as integer minor units everywhere.
4. app/api/v1/**/route.ts — implement every endpoint in the §6.3 table against the seed data.
   Every route: returns the §6.2 envelope; honours page/pageSize/sort/order/q and its filter params
   (repeated keys = OR); sleeps MOCK_LATENCY_MS (300–600ms); supports ?__fail=500 to return an error
   envelope on demand; mutations return the full updated resource; mutations mutate an in-memory
   store so changes persist for the life of the dev server.
   Passwords are NEVER returned — only passwordMasked. /accounts/:id/reveal is the one exception.
5. lib/api/client.ts — the seam. A single apiFetch<T>(path, {method, body, query, schema}) that
   reads NEXT_PUBLIC_API_BASE_URL (default "/api/v1"), injects the Authorization header from one
   place, serialises query params, unwraps the envelope, Zod-parses the payload, and throws a typed
   ApiError with code + message + field errors. Nothing else in the app calls fetch.
6. lib/api/endpoints.ts — one thin typed function per endpoint.
7. lib/api/hooks/ — TanStack Query hooks: query keys as a structured factory, list hooks that take
   the filter object, and mutation hooks that are optimistic by default (cancel queries → snapshot →
   optimistic update → toast on success → rollback + error toast on failure). Write one shared
   useOptimisticMutation helper so every mutation behaves identically.
8. docs/API-CONTRACT.md — the endpoint table, the envelope, the query-param conventions, the money
   and date conventions, the auth header, and a "how to attach a real backend" section that is
   literally: set NEXT_PUBLIC_API_BASE_URL, match this contract, done.
   Generate docs/openapi.json from the Zod schemas with z.toJSONSchema().
9. Wire /kitchen-sink's DataTable demo to a real hook against /api/v1/accounts, replacing the static
   demo-data import for that one table. It becomes the live proof that loading → populated → error →
   retry all work end to end, and it stays the regression check for every part after this.

Definition of done, verify each before stopping:
- `npm run typecheck` and `npm run lint` exit 0.
- curl /api/v1/accounts?page=1&pageSize=5&club=arsenal returns a valid envelope with meta.total.
- curl /api/v1/accounts?__fail=500 returns the error envelope, and the kitchen-sink table shows the
  ErrorState with a working Retry.
- A mutation (PATCH a listing price) updates optimistically, toasts, and rolls back visibly under
  ?__fail=500.
- No component anywhere calls fetch() directly — grep to confirm the only hit is lib/api/client.ts.
- Pointing NEXT_PUBLIC_API_BASE_URL at a nonexistent host produces a clean ApiError and the ErrorState,
  not a crash. That is the proof the seam works.
- Commit as "part 3: types, mock api, client, query hooks".

Prove it: run the dev server, curl both accounts calls above, and show me the responses plus the
kitchen-sink table in its loading, populated and error states. Then stop.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 3.5 — Server-driven pagination on DataTable (solo, ~20 min)

> **Why this exists.** Part 3 found that `DataTable` counts its own rows, so a server-paged list shows
> `Total 5 accounts · 1 / 1`. Every screen from here is server-paged. `DataTable` is a *shared* file, so
> if Part 4 and Part 6 both run in parallel worktrees they will both edit it and conflict. Do this once,
> alone, on `main`, commit — then fan out.

```
Read FETCH-IO-BUILD-PLAN.md §7 #7 and docs/API-CONTRACT.md.

components/data/DataTable.tsx currently paginates client-side: it slices the rows it was handed and
derives the total and page count from `data.length`. Every list endpoint returns
`meta: { page, pageSize, total, totalPages }`, so a server-paged screen reads "Total 5 accounts · 1 / 1".

Add server-driven pagination WITHOUT breaking the client-side mode:

- New optional props: `pageCount?: number`, `totalRows?: number`, `page?: number`,
  `onPageChange?: (page: number) => void`, `onPageSizeChange?: (size: number) => void`.
- When `pageCount` is supplied, register the table as manually paginated per the installed
  @tanstack/react-table v9 types (read them; do not assume the v8 `manualPagination` shape),
  drive the footer from `totalRows` / `pageCount`, and emit page changes upward instead of slicing.
- When those props are absent, behaviour is byte-for-byte what it is today. The kitchen-sink table
  must keep working untouched.
- Selection semantics under server paging: selecting the header checkbox selects the rows on the
  CURRENT page only, and the bulk bar says so ("12 selected on this page"). Do not silently imply a
  cross-page selection the API can't honour.
- Rows-per-page changes reset to page 1.

Then prove both modes on /kitchen-sink: keep the existing client-paged demo and add one server-paged
demo wired to /api/v1/accounts with pageSize 5, whose footer must read "Total 64 accounts · 1 / 13".

typecheck + lint exit 0. Commit as "part 3.5: server-driven pagination on DataTable".
Stop and show me both table footers.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 3.6 — three shared-file fixes (solo, on main, in the Fetch folder)

> Raised by both parallel sessions as ASKs. All three live in files the sessions are forbidden to
> touch, so they get fixed once here, on `main`. Neither worktree edits these files, so this cannot
> conflict with work in flight.

```
Three fixes in shared files. Do them on main, in the Fetch folder, in one commit each.

1. DataTable: server-driven SORTING (the sibling of the pagination work in Part 3.5).
   Both screens had to move sorting into a toolbar dropdown because DataTable has no way to hand a
   sort up to the API, and column-header sorting would only have sorted the current page — which is
   a lie. §7 #7 calls for sortable headers, so add the missing seam:
   - New optional props: `sorting?: { id: string; desc: boolean } | null`,
     `onSortingChange?: (next: { id: string; desc: boolean } | null) => void`.
   - When `onSortingChange` is supplied, register manual sorting per the installed v9 types (read
     them), keep the sort state controlled from the prop, and emit changes upward instead of sorting
     the row model. Cycle on header click: asc → desc → none.
   - Sorting a column resets to page 1 (emit through the existing page callback).
   - Columns opt in with a `sortable` flag; the header renders the existing asc/desc/unsorted icons.
   - With the props absent, behaviour is exactly what it is today. The kitchen sink must not change.
   - Under `md`, the card layout has no headers, so the toolbar Sort control stays as the mobile
     affordance. Two sorting UIs at desktop width is worse than one — headers win there.

2. components/ui/button.tsx: `asChild` is broken repo-wide.
   Button always renders up to three children (children, the label span, the forward arrow), and
   Radix `Slot` requires exactly one, so `<Button asChild><Link/></Button>` throws
   "Slot failed to slot onto its children". Fix it the documented way — import `Slottable` from
   @radix-ui/react-slot and wrap the real child:
     <Comp ...><Slottable>{children}</Slottable>{text ? … : null}{forward ? … : null}</Comp>
   Verify `<Button asChild><Link href="/accounts">…</Link></Button>` renders a single anchor with
   the button classes, the UPPER_SNAKE label and the arrow. Add it to /kitchen-sink so it stays fixed.
   Leave existing `buttonVariants()` call sites alone — they are valid shadcn usage.

3. lib/format/date.ts: change the `urgencyOf` amber threshold from 30 days to 14.
     if (daysAway <= 7) return 'urgent'
     if (daysAway <= 14) return 'soon'     // was 30
   Rationale: with 30, most of a season's fixtures are amber and the ramp stops signalling anything.
   Both screens read this helper, so kickoff and value-at-risk stay in agreement automatically.

typecheck + lint exit 0. Commit each fix separately, push main, and tell me the three SHAs.

FINISH BY PUSHING
- `git push origin main`, then report the SHAs.
- Both worktrees must pick this up before they merge: in each, `git merge main` (NOT rebase — the
  branches are already pushed and rebasing would force a rewrite). Then each session reverts its
  toolbar-sort workaround to header sorting in one commit.
```

---

## Wave 2 merge to main — run in the Fetch folder, once both branches are pushed

> I diffed both branches against main: the only file both touch is `package.json`, and only the `dev`
> script line (port 3001 vs 3002). Everything else is disjoint, so both merges are otherwise clean.

```
Merge both wave-2 branches into main.

1. `git status` clean, `git log --oneline -1` shows the partialRecord fix.
2. git merge part-4-accounts
   git merge part-6-mytickets
3. The ONLY expected conflict is package.json's "dev" script — each branch committed its own port.
   Resolve it in favour of main's bare script:
       "dev": "next dev --turbopack"
   Main is not a worktree anyone runs on a fixed port. If any OTHER file conflicts, stop and tell me:
   neither branch owns a shared file, so that would mean something went wrong.
4. Stop committing the port. In each worktree, revert the port commit and instead run the dev server
   with `npm run dev -- -p 3001` (fetch-a) / `-p 3002` (fetch-b) on the command line. Otherwise this
   same conflict recurs on every wave.
5. `npm install`, then `npm run check` and `npm run build` — both must pass on the merged main.
6. Smoke the merged result in one browser: /accounts and /mytickets both load, header sorting works
   on each, and the console is clean.
7. Push main and report the merge SHAs.
```

---

## Part 3.7 — accountStatsSchema rejects every real response (solo, on main)

```
One shared-file fix, on main, in the Fetch folder.

lib/api/schemas.ts — accountStatsSchema uses z.record() with an enum key. In Zod 4 that is
EXHAUSTIVE: it demands a key for every member of the enum. GET /accounts/stats correctly emits only
the clubs and statuses that actually have accounts, so the schema rejects every real response and
useAccountStats() has always errored. Nothing called it until Part 4, so it went unnoticed.

Verified against the installed zod 4.4.3:
  z.record(z.enum(['a','b','c']), z.number()).safeParse({ a: 1 })        → false
  z.partialRecord(z.enum(['a','b','c']), z.number()).safeParse({ a: 1 }) → true

Fix BOTH fields, not just byClub — byStatus has the same defect and is only passing today because
the seed happens to contain every status. Filter the store and it breaks the same way:

  byStatus: z.partialRecord(accountStatusSchema, z.int().nonnegative()),
  byClub:   z.partialRecord(clubIdSchema,        z.int().nonnegative()),

Then sweep the rest of the file: any other z.record() with an enum key has the same bug. Fix each,
and add a one-line comment above the first one so the next person does not reintroduce it.

Verify: curl /api/v1/accounts/stats parses clean through the client, and useAccountStats() returns
data instead of an error. typecheck + lint exit 0.
Commit as "fix: partialRecord for sparse enum-keyed maps", push main, report the SHA.
```

---

## Wave 2 merge-down — run in EACH worktree after Part 3.6 lands on main

```
main has three shared-file fixes your branch does not have yet (8b5d156 DataTable server-driven
sorting · 298589f Button asChild via Slottable · 73b09ec urgencyOf amber band 30 → 14 days).
Pick them up and adopt the sorting seam.

1. Land your own work first. `git status` must be clean before you merge — commit whatever you have
   in progress on your own branch. Do NOT merge into a dirty index.
2. `git fetch origin && git merge main`  (merge, NOT rebase — this branch is already pushed and a
   rebase would rewrite published history). Resolve nothing unexpected: you own no shared file, so a
   conflict here means something went wrong — stop and tell me rather than resolving it.
3. `npm install` if package.json changed on main, then confirm typecheck + lint still exit 0.
4. Adopt header sorting, in ONE commit:
   - Mark your sortable columns with `meta: { sortable: true }`.
   - Pass `sorting` / `onSortingChange` to DataTable, wired to the same URL state that already drives
     `sort` and `order`. Sorting resets to page 1 via your existing page callback.
   - Keep your toolbar Sort control, but render it only under `md` — the card layout has no headers
     to click. At desktop width the headers are the only sorting UI.
   - Header click cycles asc → desc → none. Manual mode pins sortDescFirst: false, so numeric and
     text columns behave identically; do not re-introduce a per-column direction.
5. Re-verify in the browser: clicking a header issues one request with the new sort and page=1, a
   non-sortable header renders no button and issues nothing, and the sort survives a page reload
   (it is in the URL).
6. Commit as "adopt DataTable header sorting", push your branch, report the SHA. Do not merge to main.
```

---

## Wave 2 setup — run this ONCE, in the main Fetch folder, before starting either session

```
Set up two parallel worktrees so two Claude Code sessions can work at once. Do all of this from the
Fetch folder, on main, with a clean working tree.

1. Verify the ground is clean:
   - `git rev-parse --show-toplevel` prints the Fetch folder (NOT Documents\1). If not, stop.
   - `git status` is clean and `git log --oneline -1` shows part 3.5.
   - `git remote -v` shows origin → https://github.com/Tom-wine/Fetch.git and main is pushed.
     If not, run the One-time GitHub setup block first.

2. Create the worktrees, branched from main:
   git worktree add -b part-4-accounts  ../fetch-a
   git worktree add -b part-6-mytickets ../fetch-b

3. Each worktree is a separate project on disk — dependencies are NOT shared:
   cd ../fetch-a && npm install
   cd ../fetch-b && npm install
   Copy .env.local into both (it is gitignored, so it does not travel with the branch).

4. Assign ports so both dev servers can run at once. In each worktree, change the `dev` script:
   fetch-a → "next dev --turbopack -p 3001"
   fetch-b → "next dev --turbopack -p 3002"
   Commit that one-line change on each branch so it never leaks back into main's script.

5. Create the shared coordination log at ../fetch-sync.md (in Documents\1, OUTSIDE both worktrees so
   neither commits it). Seed it with:

   # fetch-sync — shared log between parallel sessions
   Append-only. Never edit or delete another session's entry.
   Format: `## [session-a|session-b] <ISO timestamp> — <one-line subject>` then the body.
   Use it to ASK (something you need from the other session), ANNOUNCE (something you changed that
   the other session might rely on), or ANSWER. Tom reads this too and settles anything contested.

   ## [setup] <timestamp> — worktrees created
   session-a = ../fetch-a, branch part-4-accounts, port 3001, building Part 4 (/accounts)
   session-b = ../fetch-b, branch part-6-mytickets, port 3002, building Part 6 (/mytickets)

6. Report: both worktree paths, both branch names, both ports, and confirm `git worktree list`
   shows three entries.
```

---

## Part 4 — /accounts, the Account Manager

```
Read FETCH-IO-BUILD-PLAN.md §8.2. This is the anchor screen of the product — the reason the operator
opens the app before an on-sale.

YOU ARE SESSION-A. Worktree ../fetch-a · branch part-4-accounts · dev server on port 3001.
SESSION-B is running at the same time in ../fetch-b on branch part-6-mytickets, building Part 6
(/mytickets, the fixture list). Read the PARALLEL SESSION PROTOCOL below before touching anything.

PARALLEL SESSION PROTOCOL
- Files you own: app/(app)/accounts/**, a new components/accounts/** folder, and
  lib/api/hooks/useAccounts.ts. Edit those freely.
- SHARED — do not edit, even if it would be quick: app/globals.css · app/layout.tsx ·
  app/providers.tsx · app/(app)/layout.tsx · components/ui/** · components/data/** ·
  components/domain/** · components/shell/** · lib/format/** · lib/registries/** · lib/types.ts ·
  lib/api/client.ts · endpoints.ts · schemas.ts · app/api/**. Session-B may be editing these areas'
  neighbours, and a shared-file edit from two branches is the one thing that will cost us real time.
  If /accounts needs a change in any of them — a new StatusChip variant, a DataTable prop, an
  endpoint tweak — DO NOT make it. Write an ASK in ../fetch-sync.md, tell Tom, and carry on with the
  parts that are not blocked.
- Exception: you may APPEND an `accounts` key namespace to lib/api/hooks/keys.ts. Announce it in
  ../fetch-sync.md.
- ../fetch-sync.md is the shared log, one level above your worktree. Read it before you start and
  again before you commit. Append an entry to ASK, ANNOUNCE or ANSWER — append only, never edit
  session-b's entries. Do not block waiting for a reply: ask, state the assumption you are proceeding
  under, and keep moving.
- You share a git history with session-b, so you can read their committed work directly:
  `git log --oneline part-6-mytickets`, `git show part-6-mytickets:path/to/file`. Do this before you
  invent a pattern they may already have set — the two screens should feel like one product. Never
  check out, cherry-pick or merge their branch.
- Likely overlap to coordinate on: both screens have a filter toolbar, both use club filtering, and
  both need an account picker. If you build something session-b will obviously want, ANNOUNCE it —
  do not move it into components/domain yourself.
- Commit with explicit paths, never `git add -A`. Push part-4-accounts only. Do not merge into main.

REPO STATE — Parts 1, 2, 3 and 3.5 are done and committed. The data layer is finished:
lib/api/client.ts is the only place that calls fetch, lib/api/hooks/useAccounts.ts already exposes
list/filter hooks in the {loading, error, onRetry} shape DataTable expects, and DataTable now supports
server-driven pagination via pageCount/totalRows/page/onPageChange. Use all of it. Add no new
primitives — if a screen needs one, stop and tell me.
Note: useRevealPassword is deliberately NOT a TanStack mutation (a cached mutation result would leave
a plaintext password in the query cache). Call it directly and keep the value in the cell's own state.

Build /accounts using ONLY the primitives from Part 2 and the hooks from Part 3.

- Level 1 tabs: Accounts · Proxies · Email / IMAP · OTP Inbox.
  Accounts is fully built. Proxies gets a working read-only DataTable (with PasswordCell for the proxy
  password and a "Test" row action that optimistically updates status). IMAP and OTP Inbox get an
  EmptyState with honest copy about what each will do.
- Club tabs with counts: crest + short name + count, horizontally scrollable, "All 64" first.
  Selecting one filters the table and updates the URL query string.
- Status filter chips: All · Active · Needs login · Needs OTP · Locked · Expired, each with its count
  and its StatusChip colour.
- Toolbar (wrapping): search by email/name/membership ID (debounced 250ms) · Club ▾ ·
  Membership type ▾ · Status ▾ · Tag ▾ · Columns picker · view options · then right-aligned
  "Check all", "Add account", "Import" (primary, gradient), "Export" (downloads the filtered set as CSV).
- Table columns exactly as listed in §8.2, with PasswordCell on PASSWORD and RelativeTime on LAST CHECK.
- Row actions menu exactly as listed, with the Danger zone separated and Delete behind a ConfirmDialog
  that names the count.
- Bulk action bar on selection: N selected · Check status · Assign proxy · Add tag · Export · Delete.
  The table is server-paged, so the header checkbox selects the CURRENT PAGE only and the bar reads
  "N accounts selected on this page" (pass `pageScoped` — Part 3.5 added it). Directly under it, when
  a full page is selected and more rows match, offer one explicit escalation:
  "Select all 64 accounts matching these filters". Choosing it fetches the matching ids with a single
  large-pageSize query and holds them as an explicit id set — the bulk endpoints take `{ ids: [] }`,
  so no API change is needed. Every bulk action then names the real count, and the ConfirmDialog on
  Delete says "Delete 64 accounts?" rather than "Delete selected". Never let a bulk action operate on
  a set the user cannot see the size of.
- All filter, sort, page and tab state lives in the URL query string so a filtered view is shareable
  and survives a refresh.
- The empty state is the one written in §8.2 — gradient ticket icon, that exact copy, "Import CSV"
  primary + "Add manually" secondary. Make it good; a new user sees this first.
- Under md the table becomes stacked cards: email + club crest + status chip + membership, with the
  actions menu on the card.

"Add account" and "Import" open dialogs that are empty shells for now — Part 5 fills them.

Stop and show me /accounts in both themes, at 1440px and 375px, with the populated table, an empty
state (temporarily seed zero accounts to prove it), and the loading skeleton.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 5 — Account import: manual entry + the bulk CSV wizard ★

```
YOU ARE SESSION-A, wave 3. Worktree ../fetch-a · branch part-5-import. Branch it fresh from the
merged main WITHOUT checking main out — main is checked out in the Fetch worktree and git will refuse
to check it out twice:
    git fetch origin && git checkout -b part-5-import origin/main
Then `npm install` (main moved) and confirm `git log --oneline -1` shows the part-6 merge.
Run the dev server with `npm run dev -- -p 3001` — do NOT commit the port into package.json.
SESSION-B is building Part 8 (/mylistings) in ../fetch-b at the same time. The PARALLEL SESSION
PROTOCOL from Part 4 still applies in full: you own app/(app)/accounts/**, components/accounts/**,
a new components/import/**, and lib/api/hooks/useAccounts.ts. Everything shared stays untouched —
ASK in ../fetch-sync.md instead.

REPO STATE — main now contains Parts 1–4, 6, and fixes 3.5/3.6/3.7. Relevant to you:
- /accounts is built. This wizard mounts inside it: the toolbar's IMPORT button and the route
  /accounts/import both render the same ImportWizard. Reuse components/accounts/* rather than
  rebuilding — the club picker, the status chips and the table cells already exist.
- POST /accounts/bulk and POST /accounts/import/validate already exist and are typed. Use them.
- accountStatsSchema now returns Partial maps: reading stats.byClub[c] gives number | undefined.
  Write `?? 0`; a club with no accounts is absent, not zero.
- Both wave-2 screens hit the same URL-state bug: DataTable emits two callbacks in one tick and a
  second write built from a stale useSearchParams() snapshot silently undid the first. If this wizard
  writes step state to the URL, carry the URL forward between writes within a tick (see
  components/accounts/url-state.ts) rather than rebuilding from the render snapshot.

Read FETCH-IO-BUILD-PLAN.md §8.3 in full. This is the single most important flow in the product and
the place where most competitors are weakest. Build it to production depth — no shortcuts, no
"dropzone and hope".

Build components/import/ImportWizard, rendered both as a modal from /accounts and as a full page at
/accounts/import. Two tabs: "Manual entry" and "Bulk CSV import".

TAB A — Manual entry
A keyboard-first form with the exact fields from §8.3. Club is a searchable Select showing the crest.
Live duplicate check on the email field against existing accounts (debounced, shows an inline warning
with a link to the existing account). Validation with Zod + react-hook-form, errors inline and never
in a toast, submit disabled until valid. Two footer buttons: "Save & add another" (keeps club and
membership type, clears the identity fields, refocuses email, toasts "Account added") and "Save".

TAB B — Bulk CSV import, a 4-step stepper with a visible progress indicator

Step 1 Upload — CsvDropzone supporting drag/drop, file browse AND paste-from-clipboard.
  Accept .csv/.tsv/.txt up to 5MB / 5000 rows, with clear errors when exceeded. A prominent
  "Download CSV template" button generating the exact 15-column template from §8.3 with three example
  rows. A short table listing the 3 required and 12 optional columns. Delimiter auto-detect with a
  manual override; UTF-8 with BOM tolerated.

Step 2 Map columns — ColumnMapper: each detected CSV header on the left with its first 3 sample
  values, a Select of Fetch.io fields on the right, pre-selected by fuzzy auto-match with a confidence
  dot (green ≥0.9, amber ≥0.6, grey = manual). Unmapped columns default to "Ignore". A banner lists
  any unmapped required field and Continue stays disabled while one exists. Remember the mapping in
  session state so a repeat import is one click.

Step 3 Validate & preview — parse in a WEB WORKER (papaparse worker:true) so 5000 rows never freeze
  the UI; virtualise the preview table above 200 rows. Three counters at the top:
  "N ready · N warnings · N errors", each a filter. Implement every validation rule in the §8.3 table,
  including fuzzy club matching with a one-click "did you mean Manchester United?" fix and a
  "Fix all clubs automatically" bulk action for high-confidence matches. Offending cells are tinted
  danger/15 or warning/15 with the reason in a tooltip and are EDITABLE INLINE — fixing one updates
  the counters live. Duplicates against existing accounts offer Skip or Update existing.
  The submit button reads "Import N accounts" with the live count and is disabled while any error remains.

Step 4 Result — a progress bar during the POST to /accounts/bulk, then a summary
  "N imported · N updated · N skipped", a "Download error report (CSV)" button producing only the
  failed rows plus an appended _error column, and "Go to accounts" / "Import another file".
  Toast on completion. Warn before closing mid-import.

Non-negotiable: passwords are never written to localStorage, never console.logged, and are masked in
every preview cell (reveal per-cell on click). Parsing happens off the main thread.

Also write test fixtures at fixtures/csv/: clean-50.csv, messy-500.csv (deliberately containing bad
emails, missing passwords, misspelled clubs like "Man Utd" and "Spurs", in-file duplicates,
duplicates against the seed data, junk loyalty values, and a row with too few columns), and
wrong-format.txt.

Prove it: import messy-500.csv end to end and show me each of the four steps, then the downloaded
error report. Then stop.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 6 — /mytickets

```
Read FETCH-IO-BUILD-PLAN.md §8.4.

YOU ARE SESSION-B. Worktree ../fetch-b · branch part-6-mytickets · dev server on port 3002.
SESSION-A is running at the same time in ../fetch-a on branch part-4-accounts, building Part 4
(/accounts, the account manager). Read the PARALLEL SESSION PROTOCOL below before touching anything.

PARALLEL SESSION PROTOCOL
- Files you own: app/(app)/mytickets/** (not the fixture/[id] detail — that is Part 7), a new
  components/fixtures/** folder, and lib/api/hooks/useFixtures.ts. Edit those freely.
- SHARED — do not edit, even if it would be quick: app/globals.css · app/layout.tsx ·
  app/providers.tsx · app/(app)/layout.tsx · components/ui/** · components/data/** ·
  components/domain/** · components/shell/** · lib/format/** · lib/registries/** · lib/types.ts ·
  lib/api/client.ts · endpoints.ts · schemas.ts · app/api/**. In particular FixtureIdentity, Money
  and RelativeTime already exist in components/domain — use them as they are. If /mytickets needs a
  change to any shared file — the countdown colour ramp, a Money option, a DataTable prop — DO NOT
  make it. Write an ASK in ../fetch-sync.md, tell Tom, and carry on with what is not blocked.
- Exception: you may APPEND a `fixtures` key namespace to lib/api/hooks/keys.ts. Announce it in
  ../fetch-sync.md.
- ../fetch-sync.md is the shared log, one level above your worktree. Read it before you start and
  again before you commit. Append an entry to ASK, ANNOUNCE or ANSWER — append only, never edit
  session-a's entries. Do not block waiting for a reply: ask, state the assumption you are proceeding
  under, and keep moving.
- You share a git history with session-a, so you can read their committed work directly:
  `git log --oneline part-4-accounts`, `git show part-4-accounts:path/to/file`. Do this before you
  invent a pattern they may already have set — the two screens should feel like one product. Never
  check out, cherry-pick or merge their branch.
- Likely overlap to coordinate on: both screens have a filter toolbar, both filter by club, and both
  need an account picker. If session-a has already committed a toolbar layout or a filter-state
  pattern, match it rather than inventing a second one. If you build something they will obviously
  want, ANNOUNCE it — do not move it into components/domain yourself.
- Commit with explicit paths, never `git add -A`. Push part-6-mytickets only. Do not merge into main.

REPO STATE — Parts 1, 2, 3 and 3.5 are done and committed. lib/api/hooks/useFixtures.ts already
exposes the list hook; DataTable already supports server-driven pagination (pass pageCount/totalRows/
page/onPageChange). Add no new shared primitives.

Build the inventory list — one row per FIXTURE, not per ticket.

- Toolbar (wrapping): search · Upcoming only ▾ (All / Past / Upcoming) · Club ▾ · Competition ▾ ·
  Account ▾ · a Filters popover (search by provider/region/account, per-provider "Refresh all") ·
  view options · Refresh (primary) · Import · Export.
- Columns exactly as §8.4, including:
  · KICKOFF with "in N days" underneath and the countdown colour ramp — muted beyond 30 days,
    warning inside 14, danger inside 7.
  · VALUE AT RISK (unsold face value), right-aligned, tabular, Money component, ramping to danger as
    kickoff approaches. This column is a Fetch.io addition and the reseller's actual anxiety — make it read well.
- Default sort: kickoff ascending. Row click navigates to /mytickets/fixture/[id].
- Grid view toggle: the same data as cards, with the crest, kickoff, the four counts and value at risk.
- Footer "Total N fixtures" + pagination. All state in the URL.
- Under md, stacked cards.
- Loading skeleton, empty state ("No tickets yet — import accounts and Fetch.io will pull in what they
  own" → CTA to /accounts), and error state with retry.

Stop and show me the screen in both themes with a fixture inside 7 days visible so I can see the ramp.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 8 — /mylistings

```
YOU ARE SESSION-B, wave 3. Worktree ../fetch-b · branch part-8-listings. Branch it fresh from the
merged main WITHOUT checking main out — main is checked out in the Fetch worktree and git will refuse
to check it out twice:
    git fetch origin && git checkout -b part-8-listings origin/main
Then `npm install` (main moved) and confirm `git log --oneline -1` shows the part-6 merge.
Run the dev server with `npm run dev -- -p 3002` — do NOT commit the port into package.json.
SESSION-A is building Part 5 (the CSV import wizard) in ../fetch-a at the same time. The PARALLEL
SESSION PROTOCOL from Part 6 still applies: you own app/(app)/mylistings/**, a new
components/listings/**, and lib/api/hooks/useListings.ts. Everything shared stays untouched — ASK in
../fetch-sync.md instead.

REPO STATE — main now contains Parts 1–4, 6, and fixes 3.5/3.6/3.7.
- DataTable supports server-driven pagination AND sorting. Follow the pattern both wave-2 screens
  settled on: a sorting.ts registry mapping column id → API field, `meta: { sortable }` stamped from
  it, header sorting at desktop width, the toolbar Sort control only where there are no headers.
  A column is clickable exactly when the API can order by that field — never offer a sort the server
  cannot honour.
- The URL-state trap both wave-2 screens hit: DataTable emits the sort callback and onPageChange(1)
  in the same tick, and a second write built from a stale useSearchParams() snapshot silently undoes
  the first. Carry the URL forward between writes within a tick — see components/fixtures/filters.ts
  or components/accounts/url-state.ts, and match whichever you prefer rather than inventing a third.
- Read /accounts and /mytickets before you start (`git show main:components/accounts/AccountsToolbar.tsx`
  and friends). Two screens already set the toolbar, filter-chip and bulk-bar patterns — match them.
  Under server paging, "select all" means the current page; use the same escalation affordance
  /accounts uses if you need a full-set selection for Reprice or Delete.

Read FETCH-IO-BUILD-PLAN.md §8.6.

- Toolbar (wrapping): search · Platform ▾ · Account ▾ · Status ▾ · Columns (11) picker · a row of
  platform toggle chips (Viagogo · StubHub · GigsBerg · Ticombo, each with its brand dot) ·
  a currency normaliser "Show in: GBP ▾" with EUR, USD and an "Original" option. When normalising,
  show the converted value with the original in a tooltip; use a static rates table in lib/format.
- Columns per §8.6. PRICE is INLINE EDITABLE: click the value, it becomes a focused input, Enter
  commits, Escape cancels, blur commits. The commit is optimistic, toasts "Price updated" with an
  Undo action, and rolls back with an error toast on failure (test this with ?__fail=500).
- "Total 26 listings" + rows-per-page above; "0 of 26 selected" + pagination below.
- Bulk bar on selection: Activate · Deactivate · Reprice (opens a small dialog: set to / adjust by
  ±% / ±amount, with a preview of the resulting prices) · Delete (confirm, names the count).
- Under md, stacked cards with the price still editable.

Stop and show me an inline price edit succeeding, and the same edit rolling back on a forced failure.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Wave 3 merge + Part 8.5 — consolidation (solo, on main, in the Fetch folder)

> I diffed both wave-3 branches against main: **zero overlapping files**. Both merges are clean.
> Part 5 adds react-hook-form + @hookform/resolvers, so `npm install` after merging.
>
> Part 8.5 pays down what three waves of "do not touch shared files" deliberately deferred. Every item
> below is something a session correctly refused to do and flagged instead.

```
Merge wave 3, then consolidate the shared layer. Do this on main, in the Fetch folder.

MERGE
1. git merge part-5-import && git merge part-8-listings   — no conflicts expected. If any file
   conflicts, stop and tell me: the branches touch disjoint files.
2. npm install (part-5 added react-hook-form + @hookform/resolvers), then npm run check and
   npm run build. Smoke /accounts, /accounts/import, /mytickets, /mylistings in one browser.
3. Commit and push main before starting the consolidation, so the merge is a separate, revertible step.

CONSOLIDATE — one commit each, each with its own verification.

4. DataTable: a footer slot and a controlled page size. Session-b could not meet §8.6's
   "0 of 26 selected + pagination below" because the footer is hard-coded, and could not add a
   rows-per-page control because `uncontrolledPageSize` is internal useState that a second control
   would desync from the VIEW popover.
   - Add `footerLeft?: React.ReactNode` (defaulting to today's "Total N <noun>") and
     `footerRight?: React.ReactNode`, so a screen can render "0 of 26 selected" without duplicating
     the pagination.
   - Make page size controllable: `pageSize?: number` + `onPageSizeChange?`, uncontrolled when absent.
   - Both changes are additive; every existing call site must render byte-identically. Verify on
     /kitchen-sink, /accounts, /mytickets and /mylistings before committing.

5. Promote AccountPicker from components/fixtures/ to components/domain/. Two screens import it from
   a third screen's folder, which is how a shared component ends up owned by nobody. Move it, update
   both importers, add it to /kitchen-sink.

6. Promote the import dialog. Session-a built components/import/ImportDialog.tsx directly on Radix
   because a 15-column × 500-row table does not fit a 384px Sheet, and shared files were off limits.
   Generate the real shadcn dialog (`npm run ui -- dialog`), check it for `bg-muted` and swap to
   `bg-surface-raised`, size it for the wizard, and have ImportWizard use it. Delete the bespoke one.

7. One URL-state helper, not three. components/accounts/url-state.ts, components/fixtures/filters.ts
   and components/listings/url-state.ts each independently solved the same bug: DataTable emits two
   callbacks in one tick and a second write built from a stale useSearchParams() snapshot silently
   undoes the first. Extract the fix to lib/url-state.ts (carry the URL forward between writes within
   a tick), have all three screens use it, and keep each screen's own param schema local. Re-verify on
   each screen that a header click still issues exactly one request carrying both the new sort and
   page=1.

8. /mylistings PRICE sorting, when the currency normaliser is active. The API orders by the listing's
   native currency, so with mixed GBP/EUR the converted column looks unsorted (€325.30 above £309.20
   because 32530 > 30920). The caveat currently lives in the currency popover footer, which is not
   where the user is looking. Surface it at the point of confusion: while a normaliser other than
   "Original" is active AND the visible rows are non-monotonic, render a small muted
   "sorted by native currency" note beside the PRICE header arrow. Keep the header sortable — the
   server does honour it — and note in docs/BACKEND-HANDOFF.md that normalised sorting is a backend
   capability, not a UI one.

typecheck + lint + build all exit 0. Push main and report the SHAs.
```

---

## Wave 4 merge + Part 9.5 — coherence pass (solo, on main, in the Fetch folder)

> I diffed both wave-4 branches against main: **zero overlapping files** (20 vs 11, all disjoint).
> Both merges are clean. This is the last parallel wave — Parts 10 and 11 are solo.
>
> Part 9.5 closes what Parts 7 and 9 correctly refused to close from inside a worktree.

```
Merge wave 4, then fix the four things both sessions had to work around. On main, in the Fetch folder.

MERGE
1. git merge part-7-fixture-detail && git merge part-9-dashboard   — no conflicts expected.
2. npm run check && npm run build. Smoke all six screens in one browser. Commit and push before
   starting the coherence pass, so the merge stays a separate, revertible step.
   NOTE: never run `npm run build` while a dev server is live in the same worktree — they share
   .next and the production build breaks the dev server's manifests (session-b hit this; it looks
   like the app is 500ing when nothing is wrong). Stop the dev server, or build elsewhere.

COHERENCE — one commit each.

3. /kpis contradicts itself, visibly, on the dashboard's own tiles. totalRevenue sums the ticket
   store (22 sold → £4,095.91) while monthRevenue is the last bucket of an independently seeded
   revenue series (£36,434.40), so "this month" reads 9× "all time". Two seeds telling two stories.
   Fix in lib/mock/seed.ts + app/api/v1/kpis/route.ts by making the revenue series the single source
   of truth for money:
     totalRevenue = sum of every bucket in the series
     ticketsSold  = sum of the series' ticketsSold
     monthRevenue = the current month's bucket
   The ticket store stays what it is — current inventory, not the historical ledger. Write that
   distinction as a comment in the seed so the next reader does not "fix" it back.
   Then re-check the dashboard: the MoM chips that metrics.ts suppresses today (running totals gave a
   negative denominator) should compute honestly once the numbers agree. If a chip is still not
   meaningful, keep suppressing it — a blank is better than a fabricated percentage.

4. lib/format/date.ts has no month renderer, so the revenue axis and the third KPI tile render the
   API's raw key (`2026-08`). §9 rule 6 forbids a component calling Intl directly, and it was right
   not to. Add `formatMonth(period: string, settings: LocaleSettings, style?: 'short' | 'long')`
   handling the `YYYY-MM` form, and switch both call sites in components/dashboard/.

5. Three of the four disabled Actions items on the fixture-detail screen are disabled only because the
   mock API has no route. Add them — they are small, and the screen is the product:
   - `PATCH /tickets/:id` — there is no ticket PATCH at all today. This unblocks BOTH the Edit action
     AND the VISIBILITY eye, which is currently one-way: POST /tickets/share sets visible and nothing
     sets it back. Make the eye a real two-way toggle, optimistic + toast + rollback.
   - `POST /tickets/associate-listing` — takes an existing marketplace listing id and links it,
     rather than minting a new one the way POST /tickets/list does.
   - `POST /tickets/resell-face-value` — flips the tickets to a face-value club-exchange listing.
   Wire the three menu items to them and drop the disabled state. Update docs/API-CONTRACT.md and
   docs/openapi.json.
   `Download wallet pass` STAYS disabled: a .pkpass is a signed bundle and a Google pass a signed JWT,
   neither of which a browser can mint. Keep the label and description from §8.5, and give it a
   tooltip saying it needs a signing backend — that is an honest empty hand, not a gap.

6. Do NOT "fix" the ?__fail= behaviour in a background tab. TanStack Query pauses retries while
   document.visibilityState === 'hidden', so a failed query sits paused and the error state never
   renders — on every screen, on main, by design. Add one line to docs/API-CONTRACT.md under the
   failure-injection section: demo ?__fail= with the tab in the foreground.

typecheck + lint + build all exit 0. Push main, report the SHAs, and confirm the dashboard tiles now
agree with each other.
```

---

## Part 7 — /mytickets/fixture/[id], the core screen ★

```
YOU ARE SESSION-A, wave 4. Worktree ../fetch-a · branch part-7-fixture-detail. Branch it fresh from
the consolidated main WITHOUT checking main out (main is checked out in the Fetch worktree):
    git fetch origin && git checkout -b part-7-fixture-detail origin/main
Then `npm install` and run with `npm run dev -- -p 3001`. SESSION-B is building Part 9 (/dashboard)
in ../fetch-b at the same time — the PARALLEL SESSION PROTOCOL applies in full. You own
app/(app)/mytickets/fixture/** and a new components/fixture-detail/**. Everything shared stays
untouched; ASK in ../fetch-sync.md.

REPO STATE — main now has Parts 1–6 and 8, plus fixes 3.5/3.6/3.7/8.5. Relevant to you:
- DataTable now supports server pagination, server sorting, a footer slot and a controlled page size.
- AccountPicker lives in components/domain/. The real shadcn Dialog exists in components/ui/dialog.tsx
  — use it for the MarketplacePickerModal rather than building on Radix directly.
- lib/url-state.ts is the one URL-state helper; use it, do not write a fourth.
- Four screens already set the toolbar / filter-chip / bulk-bar / selection-escalation patterns. Read
  them before inventing anything: `git show main:components/accounts/AccountsToolbar.tsx` and friends.
- This screen is selection-driven rather than filter-driven, so the DetailPanel is the new pattern —
  the one thing here you are genuinely defining for the first time. Get it right; Part 11 will not
  rescue it.

Read FETCH-IO-BUILD-PLAN.md §8.5. This screen is the product — budget accordingly. Reproduce the
Actions menu exactly, item for item, description for description.

- Breadcrumb "My Tickets / Arsenal v Chelsea — 14 Sep 2026"; the h1 is the fixture name, never "My Tickets".
- Fixture header: 72px artwork, uppercase h1, kickoff at text-lg, "Venue — City, Country" muted,
  competition + matchweek chips, blocked-platform chips in danger tint EACH WITH A TOOLTIP reading
  "This fixture cannot be resold on Viagogo.", and on the right the value-at-risk figure + privacy eye.
- Layout: ≥1280px two panes (left ~64% table, right ~36% panel), both rounded-lg cards; below 1280px
  the panel stacks under the table. Nothing may ever be clipped — no tab label may render as "Sea".
- Left toolbar WRAPS to two rows: row 1 search · Finance (N) · Auto Group toggle (active = primary
  tint) · Actions (disabled until rows are selected) · Reset PW (warning) · Relogin (warning) ·
  Refresh (primary); row 2 All accounts ▾ · All blocks ▾ · All rows ▾. The selection count appears
  inside the Finance and Group labels.
- Ticket table columns per §8.5, with an eye toggle on VISIBILITY that optimistically flips and toasts.
- Actions dropdown: every item from the §8.5 table with its icon, label, description line and colour,
  Danger zone separated, Delete behind a ConfirmDialog titled "Delete 4 tickets?". Each action calls
  its mock endpoint, toasts, and rolls back on failure. "List" opens MarketplacePickerModal:
  a 2-column tile grid (Viagogo, StubHub, Ticombo, GigsBerg) plus Auto Listing and Auto Delisting
  tiles, plus two DISABLED "Coming soon" tiles — never a literal placeholder string — then Confirm.
- Right DetailPanel, three tabs:
  · Ticket Info — empty state "Select a ticket in the table"; on selection a summary card (artwork,
    "N tickets selected", "1 group • purchased 12 Mar", green total chip, monospace Order ID), then
    one card per lot ("North Bank Upper 21 • Row 14", "4 tickets" chip, monospace "Seats 43–46 (4)",
    monospace Order ID), then a footer with Total value (success) and Average price. The panel updates
    live as the selection changes — never a modal.
  · Fixture Info — comparable sales lookup: Block ▾, Currency ▾, Qty in a proper 2-column grid plus a
    search button; results as "Live prices" and "Recent sales" lists that fill the panel height.
  · Seat Map — stadium map placeholder with an EmptyState "Map unavailable".
- Keyboard: arrow keys move through rows, space toggles selection, shift+click range-selects,
  escape clears the selection.

Stop and show me: the empty panel state, a 4-row selection with the panel populated, the open Actions
menu, the marketplace modal, and the layout at 1279px (stacked) and 1280px (side by side).

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Part 9 — /dashboard

```
YOU ARE SESSION-B, wave 4. Worktree ../fetch-b · branch part-9-dashboard. Branch it fresh from the
consolidated main WITHOUT checking main out (main is checked out in the Fetch worktree):
    git fetch origin && git checkout -b part-9-dashboard origin/main
Then `npm install` and run with `npm run dev -- -p 3002`. SESSION-A is building Part 7 (the fixture
detail screen) in ../fetch-a at the same time — the PARALLEL SESSION PROTOCOL applies in full. You own
app/(app)/dashboard/** and a new components/dashboard/**. Everything shared stays untouched; ASK in
../fetch-sync.md.

REPO STATE — main now has Parts 1–6 and 8, plus fixes 3.5/3.6/3.7/8.5. Relevant to you:
- StatTile, the Recharts wrappers and PrivacyToggle already exist in components/domain/ from Part 2.
  Use them as they are; the chart theme object is already token-driven and validated for both themes.
- useDashboard.ts already wraps /kpis, /revenue?groupBy=month and /activity.
- accountStatsSchema returns Partial maps — reading stats.byStatus[s] gives number | undefined, so
  write `?? 0`. The account-health strip is the main consumer of that endpoint.
- The health strip's four counters must link through to /accounts with the status pre-applied in the
  URL. /accounts reads its filters from the URL, so this works today — verify the round trip rather
  than assuming it.
- Read main's chart usage before styling anything: Part 2 established that the §3.1 chip hues are not
  mark colours, and --chart-1…5 are per-theme steps chosen for adjacent-pair separation. Do not
  substitute brand hues into the chart.

Read FETCH-IO-BUILD-PLAN.md §8.1.

- Row 1: three StatTiles (Total Resale Revenue, Tickets Sold, <Month> Revenue) with 48px gradient icon
  squares, text-3xl values, muted labels and MoM delta chips.
- Row 1.5: the Account health strip — full width, a segmented bar plus four counters
  (Active · Needs login · Needs OTP · Locked); each counter links through to /accounts with that status
  filter pre-applied in the URL. This is a Fetch.io addition and it earns its place at the top.
- Row 2 left (col-span-2): "Revenue by month" card, sub-label "Monthly resale split", a
  Revenue | Tickets segmented toggle top-right, Recharts bar chart with a £ axis, dotted gridlines,
  month labels, and a themed tooltip.
- Row 2 right: the gradient promo/onboarding card, then an Activity card with tabs
  (Fetch News · Viagogo · Ticombo · StubHub · GigsBerg) listing entries as icon + bold title +
  2-line clamped body + date, the first entry with a left primary border and a "Last update" chip.
- Header right: last-updated timestamp · Refresh · the privacy eye, which blurs EVERY monetary value
  on the page (and works on /mylistings and the fixture detail too — it is app-wide).
- Zero-data state: if there are no accounts, replace the entire page with an onboarding card —
  "Import your first accounts to start tracking" — with "Import accounts" (gradient CTA) and
  "Add manually". Never render three zeros and a blank chart.

Stop and show me both the populated dashboard and the zero-data state, in both themes.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```

---

## Parallel-session protocol

Already embedded in Parts 7 and 9 below. Repeated here in case you run another part in parallel later.

```
PARALLEL SESSION PROTOCOL

You are one of two Claude Code sessions working on this project simultaneously, in separate git
worktrees that share one git history. The other session cannot see your files until you commit, and
you cannot see theirs until they do.

Files you own — edit freely:
  your screen's route folder under app/(app)/, a new components/<your-feature>/ folder, and the one
  lib/api/hooks/use<YourFeature>.ts that serves your screen.

Files that are SHARED — do not edit, even if it would be quick:
  app/globals.css · app/layout.tsx · app/providers.tsx · app/(app)/layout.tsx
  components/ui/** · components/data/** · components/domain/** · components/shell/**
  lib/format/** · lib/registries/** · lib/types.ts
  lib/api/client.ts · lib/api/endpoints.ts · lib/api/schemas.ts · app/api/**
  If your screen needs a change in any of these, DO NOT make it. Write an ASK in ../fetch-sync.md,
  tell Tom in your reply, and carry on with work that is not blocked by it.

Exception — lib/api/hooks/keys.ts: you may APPEND a new key namespace for your own feature, and only
that. Announce it in ../fetch-sync.md so the other session expects the diff.

The coordination log — ../fetch-sync.md, one level above your worktree:
- READ it before you start, and again before you commit.
- APPEND an entry when you: need something from the other session (ASK), change something they may
  depend on (ANNOUNCE), or answer their question (ANSWER). Append only; never edit their entries.
- Do not block waiting for a reply. Ask, note the assumption you are proceeding under, and move on.
- If the two of you disagree, or the ask touches a shared file, escalate to Tom rather than deciding.

You may also inspect the other session's committed work directly — you share a git history:
  `git log --oneline <their-branch>` · `git show <their-branch>:path/to/file`
Read it to stay consistent. Never check it out, cherry-pick it, or merge it.

Committing:
- `git add` explicit paths. Never `git add -A` from the repo root.
- `git status` before every commit; if a file you do not own appears, stop and ask.
- Commit and push your own branch only. Do NOT merge into main — Tom does that after review.
```

---

## Part 10 — Remaining routes, settings, ⌘K palette

```
SOLO, on main, in the Fetch folder. No worktrees, no parallel session — the fan-out is over.

REPO STATE — main is at 6f87001 and contains every screen: /dashboard, /accounts, /accounts/import,
/mytickets, /mytickets/fixture/[id], /mylistings, plus the mock API and the shared layer. Relevant:
- lib/format/ holds the ONLY formatters: money.ts (integer minor units), date.ts (incl. formatMonth),
  locale.ts + LocaleProvider, text.ts (the §3.3b grammar helpers). Preferences must drive LocaleProvider
  and nothing else — do not add a second settings store.
- lib/url-state.ts is the one URL-state helper. /settings should persist to it or to a provider, not
  to a fourth mechanism.
- GET /search?q= already exists and returns mixed-type results (account | fixture | listing |
  navigation). It is untouched since Part 3 — read it before wiring the palette, and extend the route
  if the shape does not fit rather than reshaping results in the component.
- The empty-state, ErrorState and GlyphMark primitives all exist. The "Coming soon" pages should use
  them, not bespoke markup.

Housekeeping first, in the same session:
- Add to .gitignore: `*.pdf` (the seat-sheet downloads land in the repo root when testing) and
  `fetch-sync.md` if it ever moves inside the repo. Commit `FETCH-IO-PROMPTS-ARCHIVE.md` and the
  updated `FETCH-IO-CLAUDE-CODE-PROMPTS.md` — they have been sitting untracked/modified for a while.
- The worktrees are finished: `git worktree remove ../fetch-a && git worktree remove ../fetch-b`,
  then delete the six merged part branches. `git worktree list` should show one entry when done.

Then build:

- /settings with four tabs: General (name, avatar), Preferences, Subscription (static), API.
  Preferences holds the SINGLE locale, timezone and display-currency setting that drives every date
  and money format in the app — wire it to the LocaleProvider from Part 2 and prove that changing it
  updates /mylistings and /mytickets. Also: table density, default rows per page, reduced motion.
  The API tab displays the current NEXT_PUBLIC_API_BASE_URL and a token field — the visible seam to
  the future backend.
- Every remaining nav route (/mylinks, /fixtures, /onsales, /insights, /salestracker) gets a real
  "Coming soon" page: the section icon, a one-line honest description of what it will do, and a CTA
  back to a screen that works today. No dead nav items, no blank pages.
- CommandPalette (⌘K / Ctrl+K, and the topbar trigger): searches accounts (by email, name, membership
  ID), fixtures (by team names), listings (by listing ID) and navigation, grouped by type with icons,
  keyboard navigable, Enter opens the record. Backed by GET /search?q=, debounced, with recent items
  when the query is empty.

Stop and show me the palette open with results from all four groups.

FINISH BY PUSHING
- Commit first (message as specified above), then push. `git status` must be clean afterwards.
- The remote is https://github.com/Tom-wine/Fetch.git. If `git remote -v` shows no `origin`, add it:
  `git remote add origin https://github.com/Tom-wine/Fetch.git`
- Push ONLY this repository — the Fetch folder. There is a separate, unrelated git repo one level up
  at Documents\1; never run a git command from there, and never `git add` a path outside this folder.
- On the main branch:      `git push -u origin main`
- In a parallel worktree:   `git push -u origin <this part's branch>` — then tell me the branch name
  so I can merge it, and do NOT merge into main yourself.
- Report the pushed commit SHA and confirm the working tree is clean.
```
