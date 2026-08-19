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
| **10** | **Routes restantes, settings, ⌘K** | ⏳ **à faire maintenant** · solo · `Fetch` | — |
| 11 | Polish, vérification, handoff | ⏳ solo · `Fetch` | — |
| 12 | Optionnel, après §11 | — | — |

Les waves parallèles sont terminées. Les Parts 10 et 11 tournent seules sur `main`, dans `Fetch`.
Les worktrees ne servent plus : `git worktree remove ../fetch-a && git worktree remove ../fetch-b`,
puis `git branch -d` sur les six branches de parties déjà mergées.

Les parties terminées ont été déplacées dans `FETCH-IO-PROMPTS-ARCHIVE.md`.

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

---

## Part 11 — Polish, verification, backend handoff

```
Final pass. Work through this as a checklist and report which items were already correct and which
you had to fix.

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

Handoff
- Write docs/BACKEND-HANDOFF.md: how the seam works, the one env var to change, the full endpoint
  contract with request/response examples, the envelope and error shapes, the money-as-minor-units
  and ISO-date conventions, the auth header, which endpoints are security-sensitive (credential
  storage must be encrypted at rest; /accounts/:id/reveal must be audit-logged and rate-limited),
  and a "delete app/api/v1 when you're ready" note.
- Update README.md with screenshots of the five screens.

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
