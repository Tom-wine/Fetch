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
| 11 | Polish, vérification, handoff | ✅ | `b6a5227` |
| — | **MVP livré** — six écrans, docs, 17/17 critères | ✅ | — |
| **12** | **Retrait de la revente** | ⏳ **à faire maintenant** · solo · `Fetch` | — |
| 13 | Ballots — moteur, pool, profils, historique | ⏳ solo · `Fetch` | — |
| 14 | Ballots — moniteur de run live | ⏳ solo · `Fetch` | — |

Le MVP est livré. Les Parts 12 à 14 sont un **changement de produit** : Fetch.io cesse d'être un
gestionnaire d'inventaire/revente pour devenir un gestionnaire de comptes qui **exécute des
inscriptions et des ballots**. La spec de ce module est `FETCH-IO-BALLOTS-SPEC.md`, qui fait autorité
pour tout ce qui suit. Tout tourne en solo sur `main`, dans `Fetch` — plus de worktrees.

Les parties terminées ont été déplacées dans `FETCH-IO-PROMPTS-ARCHIVE.md`.

---


## Part 12 — Retrait de la revente (solo, sur main, dans Fetch)

> Lire `FETCH-IO-BALLOTS-SPEC.md` §B0. Cette partie ne construit rien : elle enlève. Un commit propre
> et séparé, avant que le module ballots n'arrive, pour que le diff du nouveau module soit lisible.

```
Read FETCH-IO-BALLOTS-SPEC.md §B0 in full. This part only DELETES. Do not build anything new, do not
"improve" what you touch on the way past, and do not start the ballots module.

Fetch.io is no longer a resale inventory tool. Everything that talks about listings, marketplaces or
sales tracking goes. Work top-down and commit in three steps.

COMMIT 1 — the listings domain
- Delete app/(app)/mylistings/, components/listings/, lib/api/hooks/useListings.ts.
- Delete app/api/v1/listings/** and the listings entries in lib/api/endpoints.ts.
- Remove from lib/types.ts and lib/api/schemas.ts: Listing, ListingStatus, Platform, PlatformInfo,
  and the club-exchange platform added in Part 9.5.
- Delete components/domain/PlatformBadge.tsx and lib/registries/platforms.ts.
- Remove the currency normaliser (components/listings/currency.ts). KEEP toMinor / toMajorInput in
  lib/format/money.ts — three screens still edit money.
- Remove listings from lib/mock/seed.ts and from the store.
- Remove the `listing` group from the ⌘K palette and from GET /search.

COMMIT 2 — the fixture-detail resale actions
- In components/fixture-detail/: remove the `List`, `Associate listing` and `Resell at face value`
  items from the Actions menu, and delete MarketplacePickerModal.tsx.
- Remove POST /tickets/list, /tickets/associate-listing and /tickets/resell-face-value.
- Remove Fixture.blockedPlatforms and the `No Viagogo` / `No StubHub` chips from FixtureHeader —
  without resale the flag means nothing.
- The remaining actions stay exactly as they are: Group, Edit, Transfer, Download PDF,
  Download wallet pass (still disabled, still with its tooltip), Public, Share, Delete.

COMMIT 3 — navigation and routes
- Delete /salestracker (route + nav item).
- In components/shell/nav-config.ts, replace the `// fixtures` group (fixtures_calendar, on_sales)
  with a `// ballots` group containing `ballot_entries` (/ballots) and `run_history` (/ballots?tab=runs).
  Give ballot_entries its own icon — nothing that looks like the calendar or the clock (§9 rule 4).
- Create /ballots and /ballots/run/[id] as honest "coming soon" pages using the existing ComingSoon
  component, so the nav is never dead between this part and the next.
- Remove my_listings from the `// inventory` group. That group keeps my_tickets and my_links.

THEN
- Update docs/API-CONTRACT.md, docs/openapi.json, docs/BACKEND-HANDOFF.md and README.md: the removed
  endpoints go, and the resale-specific decisions (native-currency sorting, club-exchange semantics)
  go with them. Do not leave a contract describing routes that no longer exist.
- `grep -ri "listing\|marketplace\|viagogo\|stubhub\|gigsberg\|ticombo\|salestracker"` across app/,
  components/, lib/ and docs/ must return nothing but this prompt's own history.
- npm run check and npm run build exit 0. Every remaining screen still loads, console clean.

FINISH BY PUSHING
- Three commits, then `git push origin main`. Report the three SHAs and the grep result.
```

---

## Part 13 — Ballots : moteur simulé, pool de comptes, profils, historique (solo, sur main)

```
Read FETCH-IO-BALLOTS-SPEC.md end to end — it is authoritative for this module. §B3 (modèle),
§B4 (contrat), §B6 (moteur) and §B7 (règles) are the load-bearing sections.

Build everything except the live run monitor, which is Part 14. Order matters: the engine first,
because nothing else has anything to show without it.

0. Two carry-overs from Part 12, first, in their own commit.
   - Delete app/(app)/(soon)/fixtures/ and app/(app)/(soon)/onsales/. Part 12 removed their nav items
     but left the routes reachable by direct URL. They were discovery features for the resale product;
     ballots replaces them. /mytickets keeps the fixture concept — this only removes the two orphan
     "coming soon" pages.
   - Give each seed builder its OWN seeded RNG stream, keyed by name (`rngFor('accounts')`,
     `rngFor('runs')`, …) instead of drawing from one shared sequence. Removing buildListings() in
     Part 12 shortened the shared sequence and shifted every downstream draw, so the dashboard's
     figures moved. This part adds three more builders (runs, tasks, events) and would shift them
     again. Per-builder streams make the seed edit-order-independent: add a builder, and every other
     builder's data stays byte-identical. Note the current figures before and after to prove it.

1. Registry + types.
   - Add `leeds` to lib/registries/clubs.ts with a generated crest — it is not in the 2025-26 set the
     registry was seeded from, and four of the seven ballot clubs are already there.
   - Add BallotClubId, RunStatus, TaskStatus, EventLevel, BallotProfile, BallotRun, BallotTask and
     RunEvent to lib/types.ts, verbatim from §B3, with Zod schemas in lib/api/schemas.ts.
   - Ballot accounts ARE ordinary Accounts restricted to the seven clubs. Do NOT create a second
     account model — the pool reuses /accounts, which is what gives it password masking, the audited
     reveal, proxies and the Part 5 CSV import for free.

2. The simulated engine (lib/mock/ballot-engine.ts). This is the part that decides whether the module
   feels real. Follow §B6 exactly:
   - Progress is DERIVED FROM ELAPSED WALL-CLOCK TIME, never from a setInterval. On every request,
     compute where the run should be given (now - startedAt), the profile's concurrency and delay,
     then materialise the missing transitions and their events. This survives a page reload, leaks no
     timers, and replays identically.
   - Seed outcomes deterministically by runId: ~78% SUCCESS, 12% FAILED, 7% NEEDS_OTP, 3% SKIPPED,
     with plausible codes (200 ENTRY_CONFIRMED, 429 RATE_LIMITED, 403 BLOCKED, 407 PROXY_DEAD,
     408 OTP_TIMEOUT, 500 UPSTREAM_ERROR). RETRYING must produce a real second attempt visible in
     ATTEMPT.
   - pause freezes the clock (store accumulated time), resume restarts it, stop freezes everything as
     STOPPED and marks the remainder SKIPPED.
   - Seed two finished runs and one in-flight run so the history and the monitor have something to
     show on first load.

3. The API routes from the §B4 table, under app/api/v1/ballots/. The events endpoint is the one to get
   right: `?since=<seq>` returns ONLY events with seq > since, in order, with meta.lastSeq. The client
   must never have to deduplicate — if it does, the server lied.

4. lib/api/hooks/useBallots.ts + a `ballots` namespace in keys.ts. List and mutation hooks follow the
   existing useOptimisticMutation pattern. Do not add polling here — Part 14 owns that.

5. /ballots with three tabs, per §B5.1–B5.3:
   - `// pool` — the email:password textarea loader (live valid-line counter, duplicate detection,
     masked preview, field cleared on success), IMPORT_CSV opening the existing ImportWizard with the
     club preset, and the account table reusing /accounts filtered to the seven clubs with LAST_RUN
     and LAST_RESULT columns. Selection escalation as built in Part 4.
   - `// profiles` — full CRUD on BallotProfile, grouped by `// section_label` exactly as §B5.2 lists
     them. The IMAP field appears and becomes required only when otpSource is `imap`. A `default`
     profile ships and cannot be deleted; Duplicate is a row action.
   - `// runs` — the history table from §B5.3, active runs pinned at the top with a pulsing dot,
     row click navigating to /ballots/run/[id].
   Tab, filters, sort and page all live in the URL through lib/url-state.ts.

6. The START_RUN launcher dialog (§B5.4): three blocks on one screen, no stepper. It must show the
   real account count, a read-only summary of the chosen profile's settings, and a live estimate.
   Disabled with no accounts; warns when the proxy group has fewer live proxies than the concurrency;
   blocks when otpSource is `imap` with no IMAP account selected.

Rules that are not negotiable (§B7): passwords never reach localStorage, the URL, the console or an
event payload; no error message carries a `//` prefix; the §3.3b grammar applies throughout.

/ballots/run/[id] stays the ComingSoon page from Part 12 — Part 14 builds it.

Verify: paste 120 email:password lines and watch 120 accounts appear with duplicates reported and the
field cleared; create a profile; launch a run and confirm GET /ballots/runs/:id shows it advancing on
its own between two manual refreshes; reload and confirm it is still advancing from the same point.
npm run check and npm run build exit 0.

FINISH BY PUSHING — commit per numbered step, push main, report the SHAs.
```

---

## Part 14 — Ballots : le moniteur de run live (solo, sur main) ★

```
Read FETCH-IO-BALLOTS-SPEC.md §B5.5, §B4 (cadence de polling) and §B7. This is the screen the operator
watches for twenty minutes — it is to this module what the fixture-detail screen was to the last one.

REPO STATE — Part 13 shipped the engine, the pool, the profiles, the history and the launcher.
Three things exist that §B4 did not originally list; the spec has been updated and you must document
them, not re-invent them:
- `GET /ballots/imap` + a thin `ImapAccount` — without it §B5.2's required IMAP field was unsatisfiable
  and §B5.4's block could never fire. Two mailboxes are seeded, one healthy and one unreachable.
- `GET /ballots/accounts/results` — the last-run / last-result join for the pool table, done once on
  the server instead of one request per run in the component.
- `lib/use-media-query.ts` — a Radix dialog hidden with `lg:hidden` still mounts its overlay, traps
  focus and locks scroll. Wide panel and narrow dialog are two components; mount one. Reuse this hook
  for the monitor's two-pane / stacked switch rather than doing it in CSS.

Build /ballots/run/[id].

- Header per §B5.5: breadcrumb `Ballots / run_7f3a…`, h1 = the run label, RUN_ID in mono with a copy
  button, club crests, profile name linking to the profile, status chip, `started · elapsed`, and
  PAUSE · STOP · RETRY_FAILED (N) · EXPORT on the right. STOP confirms while naming what is in flight:
  "Stop this run? 47 tasks are still running."
- Stats band: seven clickable counters that filter the table (TOTAL · QUEUED · RUNNING · SUCCESS ·
  FAILED · NEEDS_OTP · SKIPPED), plus RATE and ETA, above one progress bar SEGMENTED BY OUTCOME —
  green success, red failed, amber OTP, neutral pending. One bar that says everything.
- Two panes ≥1280px, stacked below (nothing clipped, §9 rule 2):
  · Left: the task table — ACCOUNT · CLUB · STATUS · ATTEMPT (2/3) · LAST_RESPONSE (http code + short
    message) · PROXY · DURATION · UPDATED. Server sorting and filtering, search by email. Row click
    selects and feeds the right panel — table plus persistent panel, never a modal.
  · Right: three tabs. TASK_LOG (the selected task's timeline; empty state "Select a task in the
    table"). RUN_LOG (the live tail: level filter, search, and AUTO-SCROLL THAT DISABLES ITSELF the
    moment the user scrolls up, with a JUMP_TO_LATEST (14 new) button — never yank the reader's
    position). SUMMARY (breakdown by error code and by club, median duration, EXPORT_RESULTS →).

Polling, per §B4 — this is where the bugs live:
- /runs/:id every 2s, /runs/:id/tasks every 3s, /runs/:id/events every 1s, all via refetchInterval
  returning FALSE on a terminal status. One final events call after the run ends, then stop.
- Events accumulate by cursor: keep meta.lastSeq, request `?since=<lastSeq>`, append. Never
  deduplicate client-side. A page reload starts from since=0 and replays.
- Prove in the network tab that a finished run issues zero further requests, and that unmounting the
  screen stops every interval.

States: skeleton while loading, empty state when the run has no task yet, error state with retry when
a poll fails. A finished run renders identically with polling stopped and the actions adapted.

Under md: stacked cards, the stats band as 2×4, the panel below the table. "Is it working" has to be
readable on a phone.

Then update the docs: add the ballots section to docs/API-CONTRACT.md and docs/openapi.json, and to
docs/BACKEND-HANDOFF.md add — as a decision that breaks the frontend silently if got wrong — that the
event cursor is strictly increasing and append-only, that `?since=` must never return an event twice,
and that the frontend automates nothing: it creates a run and reads its state, and every browser,
proxy and OTP concern is the backend's. Update README.md.

Verify in the browser with the tab in the FOREGROUND (TanStack pauses retries while hidden): launch a
run, watch counters and log advance without touching anything, reload mid-run and confirm it resumes
from the same point with no duplicated log lines, pause and resume, stop and confirm the remainder
goes SKIPPED, then RETRY_FAILED and confirm the new run contains exactly the previous failures.
npm run check and npm run build exit 0.

FINISH BY PUSHING — push main, report the SHA, and give me a report against §B8.
```
