# Fetch.io — Claude Code prompts, one per build part

**How to use this file**

1. Ce fichier ne contient que **ce qui reste à faire**. Les parties terminées sont dans
   `FETCH-IO-PROMPTS-ARCHIVE.md` (même contenu, rien n'a été perdu).
2. Colle un bloc entier, tel quel, dans la session indiquée par son en-tête (`Fetch`, `fetch-a`, `fetch-b`).
3. Chaque prompt se termine par un point d'arrêt et un push. Relis avant de passer au suivant.
4. Si Claude Code dérive, la phrase de rattrapage est toujours : *"Re-read `FETCH-IO-BUILD-PLAN.md` §N and
   correct the implementation to match it exactly. Do not invent values."*
5. Les prompts restent en anglais : tout le repo, le code et les docs le sont, et traduire créerait un
   décalage avec ce que les sessions lisent sur le disque.

**Useful global preamble** — paste once at the start of the session, or put it in `CLAUDE.md`:

> You are building **Fetch.io**, a Premier League ticketing account manager, frontend only.
> `FETCH-IO-BUILD-PLAN.md` in the repo root is the specification and is authoritative — read it before
> every part and never invent colour values, spacing, copy or field names that contradict it.
> Rules that hold for every part:
> • TypeScript strict, no `any`, no `@ts-ignore`.
> • No component fetches directly — everything goes through `lib/api`.
> • No hardcoded hex outside `app/globals.css`; use token utilities. (Tailwind v4 is CSS-first — there
>   is no `tailwind.config.ts`. Every token is a CSS variable surfaced via `@theme inline`.)
> • **Mono-first developer aesthetic.** JetBrains Mono is the default UI font; Outfit Black uppercase is
>   headlines only; Outfit Regular is for prose past two lines. Every label follows the §3.3b terminal
>   grammar — `// section_label`, `UPPER_SNAKE` column headers and buttons, `lower_snake` nav.
>   Never snake_case user data, never `//`-prefix an error message.
> • No hardcoded date or currency formatting — use `lib/format`.
> • Every list has four states: loading skeleton, empty, error, populated.
> • Every mutation is optimistic, toasts, and rolls back on error.
> • Toolbars wrap; they never scroll horizontally.
> • Ask me before adding a dependency that is not already in `package.json`.

---

## État d'avancement

| # | Partie | Statut | SHA |
|---|---|---|---|
| 0 | Scaffold | ✅ | — |
| 1 | Tokens, thèmes, shell | ✅ | `e977007` |
| 2 | Primitives + /kitchen-sink | ✅ | `d6be2d7` |
| 3 | Types, mock API, client, hooks | ✅ | `1d3a114` |
| 3.5 | DataTable — pagination serveur | ✅ | `571161b` |
| 3.6 | Tri serveur · Button asChild · ramp 14j | ✅ | `8b5d156` `298589f` `73b09ec` |
| 3.7 | partialRecord (maps enum clairsemées) | ✅ | `c85b2b7` |
| 4 | /accounts | ✅ merged | `b90185e` |
| 6 | /mytickets | ✅ merged | `0dfd890` |
| 5 | Import CSV + saisie manuelle | ✅ poussé | `05ad2c5` |
| 8 | /mylistings | ✅ poussé | `fcfa5ef` |
| 8.5 | Merge wave 3 + consolidation | ✅ | `332a79f` |
| 7 | Détail fixture (écran cœur) | ✅ poussé | `831c168` |
| 9 | Dashboard | ✅ poussé | `6c4016e` |
| 9.5 | Merge wave 4 + passe de cohérence | ✅ | `6f87001` |
| 10 | Routes restantes, settings, ⌘K | ✅ | `985cb75` |
| **11** | **Polish, vérification, handoff** | ⏳ **dernière partie** · solo · `Fetch` | — |
| 12 | Optionnel, après §11 | — | — |

Les waves parallèles sont terminées. Les Parts 10 et 11 tournent seules sur `main`, dans `Fetch`.
Les worktrees ne servent plus : `git worktree remove ../fetch-a && git worktree remove ../fetch-b`,
puis `git branch -d` sur les six branches de parties déjà mergées.

Les parties terminées ont été déplacées dans `FETCH-IO-PROMPTS-ARCHIVE.md`.

---

## Part 11 — Polish, verification, backend handoff

```
SOLO, on main, in the Fetch folder. This is the last part: the app is feature-complete at 985cb75 and
nothing new gets built here. Work through the checklist and report, item by item, what was already
correct and what you had to fix.

REPO STATE — every screen exists: /dashboard, /accounts, /accounts/import, /mytickets,
/mytickets/fixture/[id], /mylistings, /settings, five honest "coming soon" pages, /kitchen-sink, and
the ⌘K palette. One worktree, one branch, one local repo. Preferences drive LocaleProvider, which
drives every date, number and money in the app, plus density and default rows-per-page.

Three .next traps have bitten this project already — all three are the same shared-directory problem
seen from different angles. Before ANY verification run: stop every dev server (check for stale
listeners on 3000-3003 that outlived the session that started them), `rm -rf .next`, then start one
server. Never run `npm run build` while a dev server is live in the same worktree.

Known-and-correct, do NOT "fix" these:
- ?__fail= appears to hang in a background tab: TanStack Query pauses retries while
  document.visibilityState === 'hidden'. Demo it with the tab in the foreground.
- `Download wallet pass` is disabled by design — a .pkpass is a signed bundle, a Google pass a signed
  JWT; neither can be minted in a browser. Its tooltip says so.
- cmdk's client-side filter is deliberately off in the palette: the server matches on fields that are
  not in the visible title, so cmdk would hide correct results.
- The CSV error report contains passwords on purpose — it is a subset of a file the operator supplied
  a minute earlier, and blanking them would make it un-re-importable. export-csv.ts, which exports
  from Fetch.io's own store, correctly never does.

Accessibility & keyboard
- Every icon-only control has an aria-label and a tooltip.
- Full keyboard path: tab into a table, arrow through rows, space to select, enter to open detail,
  escape to close a panel/dialog, ⌘K from anywhere. Focus is visibly ringed everywhere and focus is
  trapped and restored correctly in dialogs.
- Run an axe audit on /accounts, /mytickets/fixture/[id] and /mylistings and fix every violation.

Contrast
- Write scripts/check-contrast.ts: parse the :root and .dark blocks out of app/globals.css, compute WCAG contrast for every
  text-on-background and chip-text-on-chip-background pair in BOTH themes, print a table, and exit
  non-zero if any pair used for text falls below 4.5:1 (3:1 for ≥18.66px bold). Wire it into
  `npm run check`. Fix any failure by adjusting the token, then update the plan and
  docs/DESIGN-TOKENS.md so the values stay in sync.

Responsive
- Verify at 375 / 768 / 1280 / 1440 / 1920: no toolbar scrolls horizontally, no panel is clipped,
  every table falls back to stacked cards under md, and the "did anything sell / is anything locked"
  check is genuinely usable on a phone.

States
- Audit every list and panel for all four states (loading skeleton, empty with a CTA, error with
  retry, populated). Fix any that are missing. Confirm ?__fail=500 renders the error state everywhere.

Copy & typography
- Grep the codebase for lorem, secret, TODO, FIXME, "jj/mm/aaaa", "Lorem", and any hardcoded hex
  outside app/globals.css. Remove all of them.
- Audit the §3.3b grammar: every column header UPPER_SNAKE, every button UPPER_SNAKE, every card
  introduced by a `// section_label`, every nav item lower_snake with the `//` active prefix.
- Audit the guardrails, which matter more than the grammar: no user data anywhere passed through
  snake() (emails, names, clubs, fixtures, venues, notes, CSV cell contents), no error or confirm
  message carrying a `//` prefix, no uppercase run longer than five words, at most one GlyphMark per
  viewport region and none behind a table or form, exactly one blinking caret in the whole app.
- Grep for font-family / font-sans / font-serif outside app/globals.css and typography.tsx — there
  should be zero hits. Confirm ligatures are disabled outside <pre> and .csv-preview by rendering a
  cell containing "->" and "!=" and checking it is not glyph-substituted.

Handoff
The seam acceptance check — read this before running it
- NEXT_PUBLIC_* is inlined at BUILD time, and two dev servers in one project share .next. Running a
  second server with a different base URL rewrites the first server's bundle, so both show the new
  value and a broken seam can read as a pass. Run this check with a single dev server and a cleared
  .next: `rm -rf .next && NEXT_PUBLIC_API_BASE_URL=http://localhost:9999/v1 npm run dev`, confirm the
  ErrorState names the variable, then clear .next again before restoring.

Documents
- Write docs/BACKEND-HANDOFF.md: how the seam works, the one env var to change, the full endpoint
  contract with request/response examples, the envelope and error shapes, the money-as-minor-units
  and ISO-date conventions, the auth header, and a "delete app/api/v1 when you're ready" note.
  It must carry these decisions explicitly, because a backend that gets them wrong breaks the frontend
  silently rather than loudly:
  · Credentials are encrypted at rest. The API returns passwordMasked ONLY, and the mask is a
    CONSTANT width — one bullet per character publishes every password's length across a whole table.
  · POST /accounts/:id/reveal returns plaintext once, audit-logged (account id, never the secret),
    rate-limited, Cache-Control: no-store. It is deliberately not a cacheable mutation.
  · Enum-keyed maps (byStatus, byClub) are SPARSE — absent means no rows, not zero. The schemas use
    z.partialRecord and the types are Partial<Record<…>>.
  · Money is integer minor units everywhere, on the wire and in the store. Never a float.
  · Sorting is server-side on every list. A column is only offered when the API can order by it.
    Normalised-currency sorting on /mylistings is a BACKEND capability — the API orders by native
    currency, which is why the UI shows a "sorted by native currency" note instead of faking it.
  · club-exchange is a platform a listing can arrive at by resale, never one a listing is created on.
  · The revenue series is the ledger and the ticket store is current inventory. They are allowed to
    disagree in volume; they must not disagree about money.
- Update README.md with screenshots of the six built screens and a one-line "what works today".

Then run npm run check and npm run build, and give me a final report against the §11 acceptance
criteria in the plan — item by item, pass or fail, with the fix for anything failing.

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

## Optional Part 12 — polish beyond MVP, only once §11 is green

```
Pick up in this order, one prompt each:
1. Real-time-feel: poll /accounts/stats every 60s and surface status changes as toasts.
2. Saved views: named filter presets per screen, stored per user, shareable via URL.
3. Auto-refresh scheduling on the account checker, with per-club cadence.
4. Bulk proxy import + tester (same wizard pattern as Part 5, reuse ImportWizard).
5. /insights: ROI per club, sell-through rate, average days-to-sale.
6. E2E tests with Playwright over the three critical paths: import a CSV, list a ticket, edit a price.

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
