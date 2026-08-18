import { NextResponse } from 'next/server'
import type { Meta } from '@/lib/api/schemas'

/**
 * The §6.2 contract, implemented once so no route handler can drift from it.
 *
 * Every response is `{ data, meta, error }`. Every list honours the same query
 * params. Every route sleeps MOCK_LATENCY_MS and supports `?__fail=500`.
 */

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INJECTED_FAILURE: 'INJECTED_FAILURE',
  INTERNAL: 'INTERNAL',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export function ok<T>(data: T, meta: Meta | null = null) {
  return NextResponse.json({ data, meta, error: null })
}

export function fail(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>,
) {
  return NextResponse.json(
    { data: null, meta: null, error: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

export function notFound(what: string) {
  return fail(404, ERROR_CODES.NOT_FOUND, `${what} was not found.`)
}

/**
 * Mock routes sleep 300–600ms so skeleton states are genuinely exercised (§6.2).
 * `MOCK_LATENCY_MS=0` turns it off for tests.
 */
export async function latency(): Promise<void> {
  const configured = Number(process.env.MOCK_LATENCY_MS ?? 400)
  if (!Number.isFinite(configured) || configured <= 0) return
  // Jitter around the configured value, clamped to the 300–600ms band the plan asks for.
  const jitter = Math.round(configured * 0.25)
  const ms = Math.max(0, configured - jitter + Math.floor(Date.now() % (2 * jitter + 1)))
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * Failure injection. `?__fail=500` on any route returns the error envelope, so every
 * screen's error state can be demonstrated on demand (§6.2). Any status works —
 * `?__fail=404` and `?__fail=422` are useful too.
 */
export function injectedFailure(url: URL) {
  const raw = url.searchParams.get('__fail')
  if (!raw) return null
  const status = Number(raw)
  if (!Number.isFinite(status) || status < 400 || status > 599) return null
  return fail(
    status,
    ERROR_CODES.INJECTED_FAILURE,
    `Injected failure: the request was forced to fail with ${status}.`,
  )
}

/** Wraps a handler with the two things every route must do. */
export async function handle(
  request: Request,
  fn: (url: URL) => Promise<Response> | Response,
): Promise<Response> {
  const url = new URL(request.url)
  const injected = injectedFailure(url)
  await latency()
  if (injected) return injected

  try {
    return await fn(url)
  } catch (error) {
    return fail(
      500,
      ERROR_CODES.INTERNAL,
      error instanceof Error ? error.message : 'Something went wrong.',
    )
  }
}

/* ------------------------------------------------------------ list queries */

export interface ListQuery {
  page: number
  pageSize: number
  sort: string | null
  order: 'asc' | 'desc'
  q: string | null
}

export function listQuery(url: URL): ListQuery {
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize') ?? 25) || 25))
  const order = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc'
  return {
    page,
    pageSize,
    sort: url.searchParams.get('sort'),
    order,
    q: url.searchParams.get('q'),
  }
}

/** Repeated keys mean OR: `?club=arsenal&club=chelsea` (§6.2). */
export function multi(url: URL, key: string): string[] {
  return url.searchParams.getAll(key).filter(Boolean)
}

function valueAt(row: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
    return undefined
  }, row)
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'en')
}

/**
 * Filter → search → sort → paginate, in that order, identically on every list
 * endpoint. Returns the page plus the meta the envelope needs.
 */
export function paginate<T>(
  rows: T[],
  query: ListQuery,
  options: {
    /** Fields the free-text `q` searches. Dotted paths allowed. */
    searchable?: string[]
    /** Default sort when the caller does not ask for one. */
    defaultSort?: string
  } = {},
): { data: T[]; meta: Meta } {
  let out = rows

  if (query.q && options.searchable?.length) {
    const needle = query.q.toLowerCase()
    out = out.filter((row) =>
      options.searchable!.some((path) =>
        String(valueAt(row, path) ?? '')
          .toLowerCase()
          .includes(needle),
      ),
    )
  }

  const sort = query.sort ?? options.defaultSort
  if (sort) {
    const dir = query.order === 'desc' ? -1 : 1
    out = [...out].sort((a, b) => compare(valueAt(a, sort), valueAt(b, sort)) * dir)
  }

  const total = out.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const start = (query.page - 1) * query.pageSize

  return {
    data: out.slice(start, start + query.pageSize),
    meta: { page: query.page, pageSize: query.pageSize, total, totalPages },
  }
}

/** Reads and validates a JSON body, returning the error envelope on a bad payload. */
export async function readJson<T>(
  request: Request,
  parse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown },
): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return {
      ok: false,
      response: fail(400, ERROR_CODES.VALIDATION_ERROR, 'The request body was not valid JSON.'),
    }
  }

  const result = parse(raw)
  if (!result.success) {
    const fields: Record<string, string[]> = {}
    const issues = (result.error as { issues?: Array<{ path: PropertyKey[]; message: string }> })
      .issues
    for (const issue of issues ?? []) {
      const key = issue.path.map(String).join('.') || '_'
      ;(fields[key] ??= []).push(issue.message)
    }
    return {
      ok: false,
      response: fail(422, ERROR_CODES.VALIDATION_ERROR, 'Some fields need attention.', fields),
    }
  }

  return { ok: true, value: result.data }
}
