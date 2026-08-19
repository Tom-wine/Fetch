/**
 * Generates docs/openapi.json from the Zod schemas — the schemas are the contract,
 * so the spec is derived from them rather than maintained beside them.
 *
 * Uses Zod v4's native `z.toJSONSchema()`. No zod-to-openapi or other v3-era
 * companion package is involved.
 *
 *   node --experimental-strip-types scripts/generate-openapi.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import * as S from '../lib/api/schemas.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Every resource that gets a named component in the spec. */
const COMPONENTS = {
  Account: S.accountSchema,
  Fixture: S.fixtureSchema,
  Ticket: S.ticketSchema,
  Listing: S.listingSchema,
  Proxy: S.proxySchema,
  KpiSet: S.kpiSetSchema,
  AccountStats: S.accountStatsSchema,
  RevenuePoint: S.revenuePointSchema,
  ActivityEntry: S.activityEntrySchema,
  Notification: S.notificationSchema,
  ClubRef: S.clubRefSchema,
  SearchResult: S.searchResultSchema,
  BulkImportResult: S.bulkImportResultSchema,
  ImportRowVerdict: S.importRowVerdictSchema,
  BulkActionResult: S.bulkActionResultSchema,
  Reveal: S.revealSchema,
  Meta: S.metaSchema,
  ApiError: S.apiErrorSchema,
  AccountCreate: S.accountCreateSchema,
  AccountPatch: S.accountPatchSchema,
  ListingPatch: S.listingPatchSchema,
  ListingBulk: S.listingBulkSchema,
  TicketAction: S.ticketActionSchema,
  TicketPatch: S.ticketPatchSchema,
}

/**
 * Converting the whole registry in one call preserves `$ref`s between components —
 * converting each schema separately would inline every shared shape instead.
 * `uri` points those refs at the OpenAPI component path.
 */
const registry = z.registry()
for (const [id, schema] of Object.entries(COMPONENTS)) registry.add(schema, { id })

const { schemas: componentSchemas } = z.toJSONSchema(registry, {
  target: 'draft-2020-12',
  io: 'output',
  unrepresentable: 'any',
  uri: (id) => `#/components/schemas/${id}`,
})

// `$schema` and `$id` belong to a standalone JSON Schema document, not to an
// OpenAPI component, so they are stripped on the way out.
for (const schema of Object.values(componentSchemas)) {
  delete schema.$schema
  delete schema.$id
}

/** `{ data, meta, error }` around a named component. */
const envelope = (ref, isList = false) => ({
  type: 'object',
  required: ['data', 'meta', 'error'],
  properties: {
    data: isList
      ? { type: 'array', items: { $ref: `#/components/schemas/${ref}` } }
      : { $ref: `#/components/schemas/${ref}` },
    meta: isList
      ? { $ref: '#/components/schemas/Meta' }
      : { oneOf: [{ $ref: '#/components/schemas/Meta' }, { type: 'null' }] },
    error: { type: 'null' },
  },
})

const errorEnvelope = {
  type: 'object',
  required: ['data', 'meta', 'error'],
  properties: {
    data: { type: 'null' },
    meta: { type: 'null' },
    error: { $ref: '#/components/schemas/ApiError' },
  },
}

const LIST_PARAMS = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'pageSize',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 200, default: 25 },
  },
  { name: 'sort', in: 'query', schema: { type: 'string' } },
  { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
  { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Free-text search.' },
  {
    name: '__fail',
    in: 'query',
    schema: { type: 'integer', minimum: 400, maximum: 599 },
    description: 'Mock only. Forces the route to return an error envelope with this status.',
  },
]

const repeatable = (name, description) => ({
  name,
  in: 'query',
  explode: true,
  style: 'form',
  schema: { type: 'array', items: { type: 'string' } },
  description: `${description} Repeated keys mean OR.`,
})

const responses = (ref, isList = false) => ({
  200: {
    description: 'OK',
    content: { 'application/json': { schema: envelope(ref, isList) } },
  },
  default: {
    description: 'Error envelope',
    content: { 'application/json': { schema: errorEnvelope } },
  },
})

const body = (ref) => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } },
})

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Opaque string id. Never assume numeric or sequential.',
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Fetch.io API',
    version: '1.0.0',
    description:
      'Premier League ticketing account manager. Every response uses the { data, meta, error } envelope. ' +
      'Money is an integer of minor units plus a currency code, never a float. Dates are ISO-8601 UTC strings; ' +
      'the client formats, the server never does. Generated from the Zod schemas in lib/api/schemas.ts.',
  },
  servers: [
    { url: '/api/v1', description: 'Bundled mock (Next.js route handlers)' },
    { url: 'https://api.fetch.io/v1', description: 'Production' },
  ],
  security: [{ bearerAuth: [] }],
  paths: {
    '/accounts': {
      get: {
        summary: 'List accounts',
        parameters: [
          ...LIST_PARAMS,
          repeatable('club', 'Filter by club id.'),
          repeatable('status', 'Filter by account status.'),
          repeatable('membershipType', 'Filter by membership type.'),
          repeatable('tag', 'Filter by tag.'),
          repeatable('proxyId', 'Filter by assigned proxy.'),
        ],
        responses: responses('Account', true),
      },
      post: {
        summary: 'Create an account',
        requestBody: body('AccountCreate'),
        responses: responses('Account'),
      },
      delete: {
        summary: 'Bulk delete accounts',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: { ids: { type: 'array', items: { type: 'string' } } },
              },
            },
          },
        },
        responses: responses('BulkActionResult'),
      },
    },
    '/accounts/{id}': {
      get: { summary: 'Get one account', parameters: [idParam], responses: responses('Account') },
      patch: {
        summary: 'Update an account',
        parameters: [idParam],
        requestBody: body('AccountPatch'),
        responses: responses('Account'),
      },
    },
    '/accounts/{id}/reveal': {
      post: {
        summary: 'Reveal the plaintext password once',
        description:
          'The ONLY endpoint that returns a plaintext password. Audit-logged server side and returned with Cache-Control: no-store.',
        parameters: [idParam],
        responses: responses('Reveal'),
      },
    },
    '/accounts/{id}/{action}': {
      post: {
        summary: 'Maintenance action',
        parameters: [
          idParam,
          {
            name: 'action',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['login', 'relogin', 'reset-password'] },
          },
        ],
        responses: responses('Account'),
      },
    },
    '/accounts/bulk': {
      post: {
        summary: 'Bulk create from parsed CSV rows',
        responses: responses('BulkImportResult'),
      },
    },
    '/accounts/import/validate': {
      post: {
        summary: 'Dry-run a parsed CSV, returning per-row verdicts',
        responses: responses('ImportRowVerdict', true),
      },
    },
    '/accounts/stats': {
      get: { summary: 'Counts by status and by club', responses: responses('AccountStats') },
    },
    '/clubs': {
      get: {
        summary: 'Reference data for pickers',
        parameters: LIST_PARAMS,
        responses: responses('ClubRef', true),
      },
    },
    '/fixtures': {
      get: {
        summary: 'List fixtures',
        parameters: [
          ...LIST_PARAMS,
          repeatable('club', 'Filter by home or away club.'),
          repeatable('competition', 'Filter by competition.'),
          {
            name: 'when',
            in: 'query',
            schema: { type: 'string', enum: ['all', 'upcoming', 'past'], default: 'all' },
          },
          {
            name: 'accountId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Only fixtures this account holds tickets for.',
          },
        ],
        responses: responses('Fixture', true),
      },
    },
    '/fixtures/{id}': {
      get: { summary: 'Get one fixture', parameters: [idParam], responses: responses('Fixture') },
    },
    '/fixtures/{id}/tickets': {
      get: {
        summary: 'Seat-level rows for a fixture',
        parameters: [
          idParam,
          ...LIST_PARAMS,
          repeatable('accountId', 'Filter by account.'),
          repeatable('block', 'Filter by block.'),
        ],
        responses: responses('Ticket', true),
      },
    },
    '/tickets': {
      delete: { summary: 'Bulk delete tickets', responses: responses('BulkActionResult') },
    },
    /*
     * One path template, two methods, and the segment means something different to
     * each: an action name to POST, a ticket id to PATCH. `/tickets/share` and
     * `/tickets/tkt_014` are the same shape, so a router — and OpenAPI — gets one
     * entry for both. Splitting them into `/tickets/{action}` and `/tickets/{id}`
     * would be two identical templates, which is not a valid document.
     */
    '/tickets/{segment}': {
      patch: {
        summary: 'Edit one ticket',
        description:
          'The segment is a ticket id here. The only write that moves `visibility` in both directions; POST /tickets/share only ever reveals. Strict: an unrecognised key is a 422.',
        parameters: [
          {
            name: 'segment',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Ticket id.',
          },
        ],
        requestBody: body('TicketPatch'),
        responses: responses('Ticket'),
      },
      post: {
        summary: 'Ticket action',
        description:
          'The segment is an action name here. `list` creates a listing and mints its own marketplace id; `associate-listing` links one that already exists and 422s if the id is unknown or belongs to another fixture. `resell-face-value` takes no price and no platform — it lists on `club-exchange` at each ticket’s faceValue.',
        parameters: [
          {
            name: 'segment',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: [
                'group',
                'list',
                'associate-listing',
                'resell-face-value',
                'transfer',
                'share',
              ],
            },
            description: 'Action name.',
          },
        ],
        requestBody: body('TicketAction'),
        responses: {
          200: {
            description: 'Updated tickets, plus any listings created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data', 'meta', 'error'],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        tickets: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } },
                        listings: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Listing' },
                        },
                      },
                    },
                    meta: { type: 'null' },
                    error: { type: 'null' },
                  },
                },
              },
            },
          },
          default: {
            description: 'Error envelope',
            content: { 'application/json': { schema: errorEnvelope } },
          },
        },
      },
    },
    '/listings': {
      get: {
        summary: 'List listings',
        parameters: [
          ...LIST_PARAMS,
          repeatable('platform', 'Filter by marketplace.'),
          repeatable('status', 'Filter by listing status.'),
          repeatable('accountId', 'Filter by account.'),
          repeatable('fixtureId', 'Filter by fixture.'),
        ],
        responses: responses('Listing', true),
      },
    },
    '/listings/{id}': {
      patch: {
        summary: 'Inline price edit or status change',
        parameters: [idParam],
        requestBody: body('ListingPatch'),
        responses: responses('Listing'),
      },
    },
    '/listings/bulk': {
      post: {
        summary: 'Activate / deactivate / reprice / delete',
        requestBody: body('ListingBulk'),
        responses: responses('BulkActionResult'),
      },
    },
    '/proxies': {
      get: {
        summary: 'List proxies',
        parameters: [...LIST_PARAMS, repeatable('status', 'Filter by proxy status.')],
        responses: responses('Proxy', true),
      },
    },
    '/proxies/bulk': {
      post: {
        summary: 'Create proxies from host:port:user:pass lines',
        responses: responses('Proxy', true),
      },
    },
    '/proxies/{id}/test': {
      post: {
        summary: 'Run a connectivity check',
        parameters: [idParam],
        responses: responses('Proxy'),
      },
    },
    '/kpis': { get: { summary: 'Dashboard KPI set', responses: responses('KpiSet') } },
    '/revenue': {
      get: {
        summary: 'Revenue buckets',
        parameters: [
          {
            name: 'groupBy',
            in: 'query',
            schema: { type: 'string', enum: ['month'], default: 'month' },
          },
        ],
        responses: responses('RevenuePoint', true),
      },
    },
    '/activity': {
      get: {
        summary: 'Activity feed',
        parameters: [...LIST_PARAMS, repeatable('source', 'Filter by source.')],
        responses: responses('ActivityEntry', true),
      },
    },
    '/notifications': {
      get: {
        summary: 'Notifications',
        parameters: [...LIST_PARAMS, repeatable('kind', 'Filter by kind.')],
        responses: responses('Notification', true),
      },
    },
    '/notifications/read': {
      post: {
        summary: 'Mark notifications read; omit ids to mark all',
        responses: responses('Notification', true),
      },
    },
    '/search': {
      get: {
        summary: 'Mixed-type search for the command palette',
        parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
        responses: responses('SearchResult', true),
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', description: 'Authorization: Bearer <token>' },
    },
    schemas: componentSchemas,
  },
}

mkdirSync(join(root, 'docs'), { recursive: true })
writeFileSync(join(root, 'docs', 'openapi.json'), `${JSON.stringify(spec, null, 2)}\n`)
console.log(
  `wrote docs/openapi.json — ${Object.keys(spec.paths).length} paths, ${Object.keys(componentSchemas).length} components`,
)
