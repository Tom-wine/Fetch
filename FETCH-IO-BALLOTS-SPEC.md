# Fetch.io — Ballot Entries · spec du module (addendum au plan)

> Complément à `FETCH-IO-BUILD-PLAN.md`. Ce document fait autorité pour tout ce qui touche aux
> ballots et aux suppressions décrites en §B0. Le reste du plan (tokens §3, grammaire §3.3b,
> couture API §6, primitives §7, règles UX §9) reste valable tel quel.
>
> Décisions déjà prises : **suppression complète du domaine revente** · **polling REST** pour le
> temps réel · **un seul workflow générique** pour les sept clubs.

---

## B0. Ce qui disparaît

Le produit n'est plus « inventaire + revente ». C'est **un gestionnaire de comptes qui exécute des
inscriptions/ballots**. Tout ce qui parle de revente s'en va — écran, domaine, types, endpoints.

| Élément | Action |
|---|---|
| `/mylistings` (route, `components/listings/**`, `useListings.ts`) | supprimer |
| `Listing`, `ListingStatus`, `Platform`, `PlatformInfo`, `club-exchange` | supprimer de `lib/types.ts` |
| `GET/PATCH /listings`, `/listings/:id`, `/listings/bulk` | supprimer de `app/api/v1/**` |
| `PlatformBadge`, `lib/registries/platforms.ts` | supprimer |
| Normaliseur de devise (`components/listings/currency.ts`) | supprimer — `toMinor`/`toMajorInput` restent dans `lib/format/money.ts` |
| Écran détail-fixture : actions `List`, `Associate listing`, `Resell at face value` | supprimer |
| `MarketplacePickerModal` | supprimer |
| `Fixture.blockedPlatforms` et les chips `No Viagogo` / `No StubHub` | supprimer — sans revente, l'information n'a plus de sens |
| `/salestracker` (route + item de nav) | supprimer |
| `/fixtures` et `/onsales` (items de nav « coming soon ») | remplacer par `ballot_entries` |
| Groupe `listing` de la palette ⌘K | remplacer par un groupe `run` |

**Ce qui reste** : `/dashboard`, `/accounts` (+ import), `/mytickets` et le détail-fixture (moins les
actions de revente), `/mylinks`, `/insights`, `/settings`, `/kitchen-sink`.

Les tickets se vendent toujours — la série de revenus et les tuiles KPI restent valables. Ce qui
disparaît, c'est la gestion des annonces, pas la notion de revenu.

**Nav après remaniement :**

```
dashboard
// accounts   → account_manager · proxies · email_imap · otp_inbox
// ballots    → ballot_entries · run_history
// inventory  → my_tickets · my_links
insights
--------
settings · help_support
```

---

## B1. Ce que fait le module

L'opérateur charge des comptes club, choisit un profil de réglages, et lance un **run** : le backend
exécute une inscription (ou une entrée au ballot) pour chaque compte, en parallèle contrôlé. Le front
**n'automatise rien** — il compose la requête, puis observe. Toute la mécanique (navigateur headless,
proxies, résolution OTP, anti-bot) vit côté backend.

Sept clubs supportés, **un seul workflow générique** : le front ne connaît qu'une liste de clubs et un
jeu de réglages commun. Les différences par club vivent côté backend.

```
arsenal · chelsea · liverpool · newcastle · leeds · nottingham-forest · everton
```

> ⚠️ `leeds` n'existe pas dans `lib/registries/clubs.ts` (la Premier League 2025-26 y est figée).
> L'ajouter au registre, avec son écusson généré, fait partie du travail.

La boucle : **charger des comptes → choisir un profil → lancer → regarder → exporter / rejouer les échecs.**

L'angoisse de l'utilisateur n'est plus « suis-je exposé » mais **« est-ce que ça passe, et si non,
pourquoi »**. Chaque écran doit répondre à ça.

---

## B2. Architecture de l'information

```
/ballots                    3 onglets : // pool · // profiles · // runs
/ballots/run/[id]           ★ moniteur live d'un run — le cœur du module
```

Le lanceur est un dialogue depuis `/ballots`, pas une route.

---

## B3. Modèle de données

```ts
export type BallotClubId =
  | 'arsenal' | 'chelsea' | 'liverpool' | 'newcastle'
  | 'leeds' | 'nottingham-forest' | 'everton'

export type RunStatus  = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED' | 'FAILED'
export type TaskStatus = 'QUEUED' | 'RUNNING' | 'RETRYING' | 'SUCCESS' | 'FAILED' | 'NEEDS_OTP' | 'SKIPPED'
export type EventLevel = 'info' | 'success' | 'warn' | 'error'

export interface BallotProfile {
  id: string
  name: string
  delayMinMs: number          // pause entre deux tâches d'un même worker
  delayMaxMs: number          // tirée uniformément dans [min, max]
  concurrency: number         // workers simultanés, 1–50
  maxRetries: number          // 0–5
  timeoutMs: number
  proxyGroupId?: string       // null = pas de proxy
  otpSource: 'imap' | 'manual' | 'none'
  imapId?: string             // requis si otpSource === 'imap'
  stopOnRateLimit: boolean    // 429 → arrêter le run au lieu de continuer
  webhookUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface BallotRun {
  id: string                  // run_7f3a…
  label: string               // "Arsenal — 18 Aug 14:02"
  clubIds: BallotClubId[]
  profileId: string
  profileName: string         // dénormalisé : un profil peut être renommé après coup
  status: RunStatus
  counts: {
    total: number; queued: number; running: number
    success: number; failed: number; needsOtp: number; skipped: number
  }
  startedAt: string
  finishedAt?: string
  ratePerMin: number
  etaSeconds?: number
  lastEventSeq: number        // curseur du flux d'événements
}

export interface BallotTask {
  id: string
  runId: string
  accountId: string
  accountEmail: string        // dénormalisé pour que la table n'ait pas besoin d'une 2e requête
  clubId: BallotClubId
  status: TaskStatus
  attempt: number
  maxAttempts: number
  lastHttpStatus?: number
  lastMessage?: string        // phrase courte et lisible, jamais un stack trace
  proxyLabel?: string
  durationMs?: number
  entryRef?: string           // référence d'inscription renvoyée par le club, en cas de succès
  startedAt?: string
  updatedAt: string
}

export interface RunEvent {
  id: string
  seq: number                 // strictement croissant par run — c'est le curseur
  runId: string
  taskId?: string
  at: string
  level: EventLevel
  code: string                // SUBMITTED · OTP_REQUIRED · RATE_LIMITED · PROXY_DEAD · ENTRY_CONFIRMED …
  message: string
  httpStatus?: number
}
```

**Les comptes ballot sont des `Account` ordinaires**, restreints aux sept clubs. Pas de second modèle :
le pool réutilise `/accounts`, ce qui donne gratuitement le masquage des mots de passe, le reveal
audité, les proxies et l'import CSV de la Part 5.

---

## B4. Contrat API

Mêmes conventions qu'en §6 du plan : enveloppe `{data, meta, error}`, minor units, ISO-8601,
`?__fail=500`, latence simulée.

| Méthode | Chemin | Rôle |
|---|---|---|
| GET · POST | `/ballots/profiles` | liste · création |
| PATCH · DELETE | `/ballots/profiles/:id` | édition · suppression |
| POST | `/ballots/accounts/paste` | charge des lignes `email:password`, club imposé → `{created, updated, skipped, errors[]}` |
| GET · POST | `/ballots/runs` | historique · **créer et démarrer** |
| GET | `/ballots/runs/:id` | état d'un run (poll 2 s tant que RUNNING) |
| POST | `/ballots/runs/:id/pause` · `/resume` · `/stop` | contrôle |
| POST | `/ballots/runs/:id/retry-failed` | crée un nouveau run avec les seuls échecs |
| GET | `/ballots/runs/:id/tasks` | tâches, paginées + filtrables (`status`, `clubId`, `q`) |
| GET | `/ballots/runs/:id/events?since=<seq>&limit=200` | **flux append-only par curseur** |
| GET | `/ballots/runs/:id/export` | CSV des résultats |

### Le flux d'événements

C'est la pièce à ne pas rater. `?since=<seq>` renvoie **uniquement** les événements dont `seq > since`,
dans l'ordre, avec `meta.lastSeq`. Le client garde le curseur et n'accumule jamais de doublon. Un
rechargement de page repart de `since=0` et rejoue tout.

**Cadence de polling**, gérée par `refetchInterval` qui retourne `false` sur un statut terminal :

| Ressource | RUNNING | terminal |
|---|---|---|
| `/runs/:id` | 2 000 ms | arrêt |
| `/runs/:id/tasks` | 3 000 ms | arrêt |
| `/runs/:id/events` | 1 000 ms | un dernier appel, puis arrêt |

Ne jamais laisser un intervalle tourner sur un run terminé — c'est la fuite la plus facile à écrire et
la plus difficile à voir.

---

## B5. Écrans

### B5.1 `/ballots` — onglet `// pool`

Le vivier de comptes utilisables pour un run.

- **Chargement rapide** : un `<textarea>` mono acceptant une ligne par compte au format
  `email:password` (tolérer `email,password` et `email;password`), un `Club ▾` obligatoire au-dessus,
  et un bouton `LOAD_ACCOUNTS (N)` dont le compteur suit les lignes valides en direct.
  Sous le champ : `// 124 lignes · 3 doublons dans le presse-papier · 2 déjà connus`.
  Les mots de passe sont masqués à la frappe dans l'aperçu, jamais écrits en `localStorage`,
  jamais loggés. Le collage passe par `POST /ballots/accounts/paste`, qui réutilise la validation
  de la Part 5 — clubs flous, e-mails invalides, doublons.
- **Ou** `IMPORT_CSV →`, qui ouvre l'`ImportWizard` existant avec le club pré-sélectionné.
- **Table** : réutiliser la table de `/accounts` filtrée sur les sept clubs, colonnes
  `ACCOUNT · CLUB · STATUS · PROXY · LAST_RUN · LAST_RESULT · ACTIONS`.
  `LAST_RESULT` est un chip dérivé de la dernière `BallotTask` du compte.
- **Barre de sélection** : `N selected on this page` + l'escalade `Select all N matching` déjà
  construite en Part 4, puis `START_RUN →` qui ouvre le lanceur pré-rempli avec la sélection.

### B5.2 `/ballots` — onglet `// profiles`

CRUD de `BallotProfile`. Liste à gauche, formulaire à droite (ou dialogue sous `md`).

Champs, groupés par `// section_label` :

- `// pacing` — `Delay min` / `Delay max` (ms, min ≤ max), `Concurrency` (1–50, avec une note
  `// au-delà de 10, les clubs commencent à limiter`), `Timeout`
- `// retries` — `Max retries` (0–5), `Stop on rate limit` (switch)
- `// network` — `Proxy group ▾` (depuis `/proxies`, option `Aucun`), avec le nombre de proxies vivants
- `// otp` — `OTP source ▾` (`imap` / `manual` / `none`) ; `IMAP account ▾` n'apparaît que si `imap`,
  et devient obligatoire
- `// notify` — `Webhook URL` (optionnel, validé)

Un profil `default` est fourni et non supprimable. Dupliquer est une action de ligne.

### B5.3 `/ballots` — onglet `// runs`

Une ligne par run : `RUN_ID` (mono) · `LABEL` · `CLUBS` (écussons) · `PROFILE` · `STATUS` ·
barre de progression segmentée · `SUCCESS/FAILED/TOTAL` · `STARTED` · `DURATION` · `ACTIONS`
(`View` · `Stop` si actif · `Retry failed` · `Export` · `Delete`).

Les runs actifs sont épinglés en haut avec un point pulsant. Clic → moniteur.

### B5.4 Le lanceur — dialogue `START_RUN`

Trois blocs, un seul écran, pas de stepper :

1. `// scope` — clubs (multi, écussons) et comptes : `Selection (24)` / `All eligible (312)` /
   `Filtered (…)`, avec le compte réel affiché.
2. `// profile` — `Profile ▾` plus un résumé en lecture seule des réglages retenus, pour qu'on ne
   lance pas un run de 300 comptes avec la concurrence d'hier.
3. `// estimate` — `312 tâches · concurrence 8 · délai 2–5 s · ≈ 21 min`, recalculé en direct.

`START_RUN →` est désactivé tant qu'aucun compte n'est retenu, prévient si le groupe de proxies a
moins de proxies vivants que la concurrence, et bloque si `otpSource === 'imap'` sans compte IMAP.
Au succès : toast, puis navigation vers le moniteur.

### B5.5 `/ballots/run/[id]` — ★ le moniteur

C'est l'écran que l'opérateur regarde pendant vingt minutes. Il doit rester lisible et honnête.

**En-tête** — fil d'ariane `Ballots / run_7f3a…`, `h1` = le label du run, `RUN_ID` en mono avec copie,
écussons des clubs, nom du profil (lien vers le profil), chip de statut, `started 14:02 · elapsed 04:12`,
et à droite `PAUSE` · `STOP` (confirmation nommant le nombre de tâches en cours) · `RETRY_FAILED (12)`
· `EXPORT`.

**Bandeau de statistiques** — sept compteurs cliquables qui filtrent la table :
`TOTAL · QUEUED · RUNNING · SUCCESS · FAILED · NEEDS_OTP · SKIPPED`, plus `RATE` (tâches/min) et
`ETA`. Sous eux, une barre de progression **segmentée par issue** (vert succès, rouge échec, ambre
OTP, neutre en attente) — une seule barre qui dit tout.

**Deux panneaux ≥ 1280 px**, empilés en dessous (jamais tronqués, cf. §9 règle 2) :

*Gauche — table des tâches.* Colonnes `ACCOUNT` · `CLUB` · `STATUS` · `ATTEMPT` (`2/3`) ·
`LAST_RESPONSE` (code HTTP + message court) · `PROXY` · `DURATION` · `UPDATED`. Tri serveur, filtres
`Status ▾` · `Club ▾` · recherche par e-mail. Le clic sélectionne la tâche et alimente le panneau
droit — même motif que le détail-fixture, table + panneau persistant, jamais de modale.

*Droite — trois onglets.*
- `TASK_LOG` — la chronologie de la tâche sélectionnée : horodatage mono, chip de niveau, code,
  message, statut HTTP. État vide : « Select a task in the table ».
- `RUN_LOG` — le tail live de tout le run. Filtres par niveau, recherche, **auto-scroll qui se
  désactive dès que l'utilisateur remonte**, avec un bouton `JUMP_TO_LATEST (14 new)`. Rien n'est
  plus agaçant qu'un log qui vous arrache la lecture.
- `SUMMARY` — répartition par code d'erreur (`RATE_LIMITED 14 · PROXY_DEAD 3 · OTP_TIMEOUT 2`),
  par club, durée médiane, et un `EXPORT_RESULTS →`.

**États** — squelette au chargement, état vide si le run n'a pas encore de tâche, état d'erreur avec
reprise si le poll échoue. Un run terminé s'affiche identiquement, poll arrêté, actions adaptées.

**Sous `md`** : cartes empilées, le bandeau de stats passe en 2×4, le panneau descend sous la table.
« Est-ce que ça passe » doit être lisible sur un téléphone.

---

## B6. Le moteur simulé

Sans backend, `/ballots` n'a rien à montrer. Le mock doit **simuler un run qui progresse en temps
d'horloge**, sinon aucun des états live n'est réellement construit.

- À la création d'un run, matérialiser les tâches en `QUEUED` et poser un `startedAt`.
- La progression est **dérivée du temps écoulé, pas d'un timer** : à chaque requête, calculer où le run
  devrait en être d'après `now - startedAt`, la concurrence et le délai du profil, puis matérialiser
  les transitions manquantes et les événements correspondants. Cette approche survit au rechargement,
  ne fuit aucun `setInterval`, et rejoue à l'identique.
- Semer par `runId` pour que les issues soient **déterministes** : ~78 % `SUCCESS`, 12 % `FAILED`,
  7 % `NEEDS_OTP`, 3 % `SKIPPED`, avec des codes plausibles — `200 ENTRY_CONFIRMED`,
  `429 RATE_LIMITED`, `403 BLOCKED`, `407 PROXY_DEAD`, `408 OTP_TIMEOUT`, `500 UPSTREAM_ERROR`.
- Chaque transition émet un ou plusieurs `RunEvent` avec un `seq` croissant. `RETRYING` produit une
  vraie deuxième tentative, visible dans `ATTEMPT`.
- `pause` gèle l'horloge (mémoriser le temps accumulé), `resume` la relance, `stop` fige tout en
  `STOPPED` et marque le reste `SKIPPED`.
- Semer aussi **deux runs terminés et un run en cours** pour que l'historique et le moniteur aient
  quelque chose à montrer dès le premier chargement.

---

## B7. Règles qui ne se négocient pas

1. **Le front n'automatise rien.** Aucune requête vers un site de club, aucun navigateur piloté. Il
   crée un run et lit son état. Le dire explicitement dans `BACKEND-HANDOFF.md`.
2. **Les mots de passe** ne touchent ni `localStorage`, ni l'URL, ni la console, ni un log d'événement.
   Le collage `email:password` les envoie une fois et vide le champ. La table les masque à largeur
   constante, comme partout ailleurs.
3. **Aucun message d'erreur préfixé `//`** (§3.3b) : un run qui échoue doit se lire en clair.
   `RATE_LIMITED` est un code, pas une explication — chaque code a une phrase lisible à côté.
4. **Aucun intervalle de poll ne survit à un statut terminal**, ni au démontage de l'écran.
5. **Le curseur d'événements ne recule jamais.** Pas de déduplication côté client : si le client doit
   dédupliquer, c'est que le serveur a menti.
6. **Toute action destructive ou irréversible nomme son ampleur** : « Stop this run? 47 tasks are
   still running. »
7. Grammaire §3.3b partout : `// pool`, `RUN_ID`, `START_RUN →`, `RETRY_FAILED (12)`,
   statuts en `UPPER_SNAKE`. Les e-mails, noms de clubs et messages du club restent verbatim.

---

## B8. Critères d'acceptation du module

- [ ] `/mylistings`, `/salestracker`, le domaine `Listing` et les actions de revente n'existent plus — `grep -ri listing` ne renvoie que de l'historique git.
- [ ] `leeds` est dans le registre des clubs, avec écusson.
- [ ] Coller 120 lignes `email:password` crée 120 comptes, signale les doublons, et laisse le champ vide.
- [ ] Un run lancé progresse visiblement sans rechargement, et sa progression survit à un F5.
- [ ] Le tail live n'affiche jamais deux fois le même événement, et cesse de tirer sur un run terminé (vérifié dans l'onglet réseau).
- [ ] `PAUSE` gèle les compteurs, `RESUME` reprend là où c'était, `STOP` marque le reste `SKIPPED`.
- [ ] `RETRY_FAILED` crée un nouveau run contenant exactement les échecs du précédent.
- [ ] Le moniteur est utilisable à 375 px : statut, compteurs et derniers échecs lisibles.
- [ ] Aucun mot de passe dans `localStorage`, la console, l'URL ou un événement.
- [ ] `npm run check` (dont la porte de contraste) et `npm run build` sortent à 0.
