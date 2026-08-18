# Fetch.io

Fetch.io is the control room for someone who runs **many Premier League ticketing accounts**.

Club ticketing is membership-gated: every account is a membership with its own credentials, client
reference, loyalty points and eligibility window. A serious operator holds tens to hundreds of these
across clubs, buys allocations when they drop, and relists on secondary marketplaces (Viagogo,
StubHub, Ticombo, GigsBerg).

The app answers four questions, in order of how often they get asked:

| Question                                              | Screen                                     |
| ----------------------------------------------------- | ------------------------------------------ |
| Are my accounts healthy — logged in, unlocked, eligible? | `/accounts`                                |
| Did anything sell, and what am I exposed to?          | `/dashboard`                               |
| What do I own, per fixture?                           | `/mytickets` → `/mytickets/fixture/[id]`   |
| What is live on the market and at what price?         | `/mylistings`                              |

**This repo is frontend only.** There is no backend. Every read and write goes through a typed,
Zod-validated API client whose base URL is a single environment variable, so a real backend can be
attached without touching a component.

## Running it

```bash
npm install
cp .env.example .env.local   # already present in a fresh clone of this working tree
npm run dev                  # http://localhost:3000
```

Other scripts:

| Script                 | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | dev server (Turbopack)                        |
| `npm run build`        | production build                              |
| `npm run start`        | serve the production build                    |
| `npm run lint`         | ESLint                                        |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check, no writes                     |
| `npm run check`        | `lint` + `typecheck` — the quality gate       |
| `npm run ui -- <name>` | add a shadcn/ui primitive into `components/ui` |

## Environment

```env
NEXT_PUBLIC_API_BASE_URL=/api/v1
MOCK_LATENCY_MS=400
```

`NEXT_PUBLIC_API_BASE_URL` is the seam. It defaults to `/api/v1`, served by mock route handlers in
`app/api/v1/**`. Point it at `https://api.fetch.io/v1` and the app talks to a real backend instead —
that one line is the only change required. `MOCK_LATENCY_MS` makes the mock routes sleep so skeleton
states are genuinely exercised; set it to `0` in tests.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · TanStack Table ·
TanStack Query · TanStack Virtual · Recharts · Zod · next-themes · sonner · cmdk · papaparse.
Dark-first theme, with a fully correct light theme.

## The plan

Everything — brand tokens, data model, API contract, component inventory, screen specs, acceptance
criteria and the 12-part build order — lives in **[`FETCH-IO-BUILD-PLAN.md`](./FETCH-IO-BUILD-PLAN.md)**.
Read it before adding anything. This repo is currently at **Part 0: repo scaffold**.
