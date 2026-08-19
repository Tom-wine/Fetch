import { z } from 'zod'

/**
 * THE CONTRACT (§6).
 *
 * These schemas — not the TypeScript interfaces — are what the client validates
 * every response against. If a real backend diverges, the parse fails loudly at the
 * seam with a readable path instead of rendering `undefined` three components deep.
 *
 * lib/types.ts holds the same shapes as hand-written interfaces because §5 specifies
 * them and they read better in editor tooltips; `schemas.test-types.ts` is not needed
 * because the route handlers and the seed are both typed against lib/types.ts and
 * parsed through these schemas, so a drift between the two fails the build or the parse.
 *
 * Money is `z.int()` — minor units, never a float (§6.2).
 * Dates are ISO-8601 UTC strings; nothing here is pre-formatted.
 */

/* ------------------------------------------------------------------ unions */

export const clubIdSchema = z.enum([
  'arsenal',
  'aston-villa',
  'bournemouth',
  'brentford',
  'brighton',
  'chelsea',
  'crystal-palace',
  'everton',
  'fulham',
  'ipswich',
  'leeds',
  'leicester',
  'liverpool',
  'man-city',
  'man-utd',
  'newcastle',
  'nottingham-forest',
  'southampton',
  'tottenham',
  'west-ham',
  'wolves',
])

export const providerIdSchema = z.enum(['club-direct', 'ticketmaster-uk', 'eventim-uk'])

export const currencySchema = z.enum(['GBP', 'EUR', 'USD'])
export const competitionSchema = z.enum([
  'premier-league',
  'fa-cup',
  'efl-cup',
  'ucl',
  'uel',
  'friendly',
])

export const membershipTypeSchema = z.enum([
  'season-ticket',
  'official-member',
  'digital-member',
  'international-member',
  'ticket-exchange',
  'general-sale',
  'hospitality',
])

export const accountStatusSchema = z.enum([
  'active',
  'needs_login',
  'needs_otp',
  'locked',
  'expired',
  'error',
])

export const ticketStatusSchema = z.enum(['ticket', 'listed', 'sold', 'transferred'])
export const ticketVisibilitySchema = z.enum(['visible', 'hidden'])
export const proxyStatusSchema = z.enum(['ok', 'dead', 'untested'])

/** An ISO-8601 UTC instant. Opaque to the server; the client formats it. */
const isoDate = z.iso.datetime()

/** Integer minor units. A float here is a bug, so the schema refuses one. */
const minorUnits = z.int()

/* --------------------------------------------------------------- resources */

export const accountSchema = z.object({
  id: z.string(),
  email: z.email(),
  passwordMasked: z.string(),
  club: clubIdSchema,
  provider: providerIdSchema,
  membershipId: z.string(),
  membershipType: membershipTypeSchema,
  memberSince: isoDate.optional(),
  membershipExpiresAt: isoDate.optional(),
  loyaltyPoints: z.int().nonnegative().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  status: accountStatusSchema,
  proxyId: z.string().optional(),
  imapId: z.string().optional(),
  ticketsPurchased: z.int().nonnegative(),
  lastCheckedAt: isoDate.optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  createdAt: isoDate,
})

export const venueSchema = z.object({
  name: z.string(),
  city: z.string(),
  country: z.string(),
})

export const fixtureCountsSchema = z.object({
  total: z.int().nonnegative(),
  listed: z.int().nonnegative(),
  sold: z.int().nonnegative(),
  transferred: z.int().nonnegative(),
})

export const fixtureSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  homeClub: clubIdSchema,
  awayClub: clubIdSchema,
  competition: competitionSchema,
  matchweek: z.int().positive().optional(),
  kickoff: isoDate,
  venue: venueSchema,
  artworkUrl: z.string(),
  provider: providerIdSchema,
  counts: fixtureCountsSchema,
  faceValueTotal: minorUnits,
  valueAtRisk: minorUnits,
  currency: currencySchema,
})

export const ticketSchema = z.object({
  id: z.string(),
  fixtureId: z.string(),
  block: z.string(),
  levelName: z.string(),
  row: z.string(),
  seat: z.string(),
  price: minorUnits,
  faceValue: minorUnits,
  currency: currencySchema,
  accountId: z.string(),
  visibility: ticketVisibilitySchema,
  status: ticketStatusSchema,
  groupId: z.string().optional(),
  orderId: z.string(),
  purchasedAt: isoDate,
})

export const proxySchema = z.object({
  id: z.string(),
  groupId: z.string(),
  label: z.string(),
  host: z.string(),
  port: z.int().positive(),
  username: z.string(),
  passwordMasked: z.string(),
  country: z.string().optional(),
  status: proxyStatusSchema,
  lastTestedAt: isoDate.optional(),
  latencyMs: z.int().nonnegative().optional(),
})

export const kpiSetSchema = z.object({
  totalRevenue: minorUnits,
  ticketsSold: z.int().nonnegative(),
  monthRevenue: minorUnits,
  currency: currencySchema,
  accountsTotal: z.int().nonnegative(),
  accountsHealthy: z.int().nonnegative(),
  accountsNeedAction: z.int().nonnegative(),
  valueAtRisk: minorUnits,
})

export const accountStatsSchema = z.object({
  total: z.int().nonnegative(),
  // z.record() with an ENUM key is exhaustive in Zod 4 — it demands an entry for
  // every member. These maps are sparse by design (a club with no accounts is
  // absent, not zero), so they need partialRecord. Use it for every enum-keyed map.
  byStatus: z.partialRecord(accountStatusSchema, z.int().nonnegative()),
  byClub: z.partialRecord(clubIdSchema, z.int().nonnegative()),
})

export const revenuePointSchema = z.object({
  period: z.string(),
  revenue: minorUnits,
  ticketsSold: z.int().nonnegative(),
  currency: currencySchema,
})

export const activityEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(['sale', 'account', 'system']),
  source: z.union([z.literal('fetch'), providerIdSchema]),
  title: z.string(),
  body: z.string(),
  at: isoDate,
})

export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(['success', 'issue']),
  title: z.string(),
  body: z.string(),
  at: isoDate,
  unread: z.boolean(),
})

export const clubRefSchema = z.object({
  id: clubIdSchema,
  name: z.string(),
  short: z.string(),
  stadium: z.string(),
  city: z.string(),
  primaryColor: z.string(),
  crest: z.string(),
})

export const searchResultSchema = z.object({
  id: z.string(),
  type: z.enum(['account', 'fixture', 'navigation']),
  title: z.string(),
  subtitle: z.string().optional(),
  href: z.string(),
})

export const bulkImportResultSchema = z.object({
  created: z.int().nonnegative(),
  updated: z.int().nonnegative(),
  skipped: z.int().nonnegative(),
  errors: z.array(
    z.object({
      row: z.int().nonnegative(),
      email: z.string().optional(),
      message: z.string(),
    }),
  ),
})

export const importRowVerdictSchema = z.object({
  row: z.int().nonnegative(),
  status: z.enum(['ok', 'warning', 'error']),
  email: z.string().optional(),
  messages: z.array(z.string()),
})

/** POST /accounts/:id/reveal — the one endpoint that returns a plaintext password. */
export const revealSchema = z.object({
  password: z.string(),
  /** When the caller should consider it stale. The UI re-masks after 10s regardless. */
  expiresAt: isoDate,
})

/** Bulk delete and the maintenance actions all report the same shape. */
export const bulkActionResultSchema = z.object({
  affected: z.int().nonnegative(),
  ids: z.array(z.string()),
})

/* --------------------------------------------------------------- envelope */

export const metaSchema = z.object({
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
  /**
   * Cursor into an append-only feed, present only on `/ballots/runs/:id/events`
   * (§B4). It is the seq of the last event in THIS response, so a truncated page
   * resumes exactly where it stopped; `hasMore` says whether to ask again straight
   * away rather than waiting for the next poll.
   */
  lastSeq: z.int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
})

export type Meta = z.infer<typeof metaSchema>

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  /** Field-level messages for a form, keyed by field name. */
  fields: z.record(z.string(), z.array(z.string())).optional(),
})

export type ApiErrorBody = z.infer<typeof apiErrorSchema>

/**
 * `{ data, meta, error }` — every successful response, §6.2. `meta` is null for a
 * single resource and populated for a list.
 */
export function ok<T extends z.ZodType>(schema: T) {
  return z.object({
    data: schema,
    meta: metaSchema.nullable(),
    error: z.null(),
  })
}

/** `{ data: null, meta: null, error: { code, message, fields? } }`. */
export const errorEnvelopeSchema = z.object({
  data: z.null(),
  meta: z.null(),
  error: apiErrorSchema,
})

/** A list response: `data: T[]` plus a non-null `meta`. */
export function okList<T extends z.ZodType>(schema: T) {
  return z.object({
    data: z.array(schema),
    meta: metaSchema,
    error: z.null(),
  })
}

/** Either shape, for a client that has not yet branched on `error`. */
export function envelope<T extends z.ZodType>(schema: T) {
  return z.union([ok(schema), errorEnvelopeSchema])
}

/* ----------------------------------------------------------- write payloads */

/** POST /accounts — everything the manual-entry form can send. */
export const accountCreateSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  club: clubIdSchema,
  provider: providerIdSchema.optional(),
  membershipId: z.string().optional(),
  membershipType: membershipTypeSchema.optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  loyaltyPoints: z.int().nonnegative().optional(),
  proxyId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export type AccountCreate = z.infer<typeof accountCreateSchema>

/** PATCH /accounts/:id — every field optional; `password` is write-only. */
export const accountPatchSchema = accountCreateSchema.partial().extend({
  status: accountStatusSchema.optional(),
})

export type AccountPatch = z.infer<typeof accountPatchSchema>

/* ------------------------------------------------------------------ ballots */

export const ballotClubIdSchema = z.enum([
  'arsenal',
  'chelsea',
  'liverpool',
  'newcastle',
  'leeds',
  'nottingham-forest',
  'everton',
])

export const runStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'PAUSED',
  'COMPLETED',
  'STOPPED',
  'FAILED',
])

export const taskStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'RETRYING',
  'SUCCESS',
  'FAILED',
  'NEEDS_OTP',
  'SKIPPED',
])

export const eventLevelSchema = z.enum(['info', 'success', 'warn', 'error'])

export const otpSourceSchema = z.enum(['imap', 'manual', 'none'])

export const ballotProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  delayMinMs: z.int().nonnegative(),
  delayMaxMs: z.int().nonnegative(),
  concurrency: z.int().min(1).max(50),
  maxRetries: z.int().min(0).max(5),
  timeoutMs: z.int().positive(),
  proxyGroupId: z.string().optional(),
  otpSource: otpSourceSchema,
  imapId: z.string().optional(),
  stopOnRateLimit: z.boolean(),
  webhookUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
})

/**
 * The writable half of a profile. `delayMin <= delayMax` and the IMAP requirement are
 * checked here rather than in the form, so the rule holds for any caller — the API is
 * the boundary, not the dialog.
 */
export const ballotProfileInputSchema = z
  .object({
    name: z.string().min(1),
    delayMinMs: z.int().nonnegative(),
    delayMaxMs: z.int().nonnegative(),
    concurrency: z.int().min(1).max(50),
    maxRetries: z.int().min(0).max(5),
    timeoutMs: z.int().positive(),
    proxyGroupId: z.string().optional(),
    otpSource: otpSourceSchema,
    imapId: z.string().optional(),
    stopOnRateLimit: z.boolean(),
    webhookUrl: z.union([z.url(), z.literal('')]).optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.delayMinMs <= v.delayMaxMs, {
    message: 'The minimum delay cannot be longer than the maximum.',
    path: ['delayMinMs'],
  })
  .refine((v) => v.otpSource !== 'imap' || Boolean(v.imapId), {
    message: 'Choose the IMAP account that receives the codes.',
    path: ['imapId'],
  })

export type BallotProfileInput = z.infer<typeof ballotProfileInputSchema>

export const imapAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  host: z.string(),
  status: z.enum(['ok', 'error']),
  lastCheckedAt: isoDate.optional(),
})

export const ballotRunSchema = z.object({
  id: z.string(),
  label: z.string(),
  clubIds: z.array(ballotClubIdSchema),
  profileId: z.string(),
  profileName: z.string(),
  status: runStatusSchema,
  counts: z.object({
    total: z.int().nonnegative(),
    queued: z.int().nonnegative(),
    running: z.int().nonnegative(),
    success: z.int().nonnegative(),
    failed: z.int().nonnegative(),
    needsOtp: z.int().nonnegative(),
    skipped: z.int().nonnegative(),
  }),
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
  ratePerMin: z.number().nonnegative(),
  etaSeconds: z.int().nonnegative().optional(),
  lastEventSeq: z.int().nonnegative(),
})

export const ballotTaskSchema = z.object({
  id: z.string(),
  runId: z.string(),
  accountId: z.string(),
  accountEmail: z.string(),
  clubId: ballotClubIdSchema,
  status: taskStatusSchema,
  attempt: z.int().nonnegative(),
  maxAttempts: z.int().nonnegative(),
  lastHttpStatus: z.int().optional(),
  lastMessage: z.string().optional(),
  proxyLabel: z.string().optional(),
  durationMs: z.int().nonnegative().optional(),
  entryRef: z.string().optional(),
  startedAt: isoDate.optional(),
  updatedAt: isoDate,
})

export const runEventSchema = z.object({
  id: z.string(),
  seq: z.int().nonnegative(),
  runId: z.string(),
  taskId: z.string().optional(),
  at: isoDate,
  level: eventLevelSchema,
  code: z.string(),
  message: z.string(),
  httpStatus: z.int().optional(),
})

/** `POST /ballots/runs`. The account set is resolved server-side from these. */
export const runCreateSchema = z.object({
  clubIds: z.array(ballotClubIdSchema).min(1),
  profileId: z.string().min(1),
  /** Explicit account ids. Absent means every eligible account in `clubIds`. */
  accountIds: z.array(z.string()).optional(),
  label: z.string().optional(),
})

export type RunCreate = z.infer<typeof runCreateSchema>

/**
 * `POST /ballots/accounts/paste`. The raw block is sent ONCE and never stored: §B7
 * rule 2 keeps passwords out of localStorage, the URL, the console and every event
 * payload, so the client clears the field the moment this resolves.
 */
export const accountPasteSchema = z.object({
  club: ballotClubIdSchema,
  /** One `email:password` per line. `,` and `;` are accepted too. */
  text: z.string().min(1),
})

export type AccountPaste = z.infer<typeof accountPasteSchema>

/**
 * `GET /ballots/accounts/results` — one row per account that has been attempted at
 * least once, for the pool table's `LAST_RUN` and `LAST_RESULT` columns.
 */
export const accountResultSchema = z.object({
  accountId: z.string(),
  runId: z.string(),
  runLabel: z.string(),
  at: isoDate,
  status: taskStatusSchema,
  httpStatus: z.int().optional(),
  message: z.string().optional(),
  entryRef: z.string().optional(),
})

export type AccountResult = z.infer<typeof accountResultSchema>

export const idsSchema = z.object({ ids: z.array(z.string()).min(1) })

export const ticketActionSchema = z.object({
  ids: z.array(z.string()).min(1),
  price: minorUnits.positive().optional(),
})

/**
 * `PATCH /tickets/:id`. Every field optional — a patch says what changed, and an
 * absent key means "leave it". `.strict()` so a typo'd field is a 422 rather than a
 * write that silently does nothing.
 */
export const ticketPatchSchema = z
  .object({
    price: minorUnits.positive().optional(),
    block: z.string().min(1).optional(),
    row: z.string().min(1).optional(),
    seat: z.string().min(1).optional(),
    visibility: ticketVisibilitySchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'A patch must change something.' })

export type TicketPatch = z.infer<typeof ticketPatchSchema>

export const proxyBulkSchema = z.object({
  /** Raw `host:port:user:pass` lines, as pasted. */
  lines: z.array(z.string()).min(1),
  groupId: z.string().optional(),
})
