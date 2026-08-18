import type { z } from 'zod'
import { apiErrorSchema, type ApiErrorBody, type Meta } from './schemas'

/**
 * THE SEAM (§6.1).
 *
 * Every request in the app goes through `apiFetch`. Nothing else calls `fetch` —
 * that is what makes swapping in a real backend a one-line change:
 *
 *     NEXT_PUBLIC_API_BASE_URL=https://api.fetch.io/v1
 *
 * The response is unwrapped from the §6.2 envelope and Zod-parsed. If a backend
 * diverges from the contract, the parse fails here with a readable path instead of
 * rendering `undefined` three components deep.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'

/** The one place an auth token is attached (§6.2). */
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

function readToken(): string | null {
  if (authToken) return authToken
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem('fetch_token')
  } catch {
    return null
  }
}

/**
 * A failed request, whatever the cause. Network errors, non-2xx responses, envelope
 * violations and Zod parse failures all arrive here, so callers handle one type.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields?: Record<string, string[]>

  constructor(params: {
    code: string
    message: string
    status: number
    fields?: Record<string, string[]>
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.fields = params.fields
  }

  /** True when the failure is worth a retry button rather than a form message. */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500
  }
}

export type QueryValue = string | number | boolean | null | undefined | Array<string | number>

export type QueryParams = Record<string, QueryValue>

/**
 * Serialises the §6.2 query convention. An array becomes repeated keys, which the
 * API reads as OR: `?club=arsenal&club=chelsea`.
 */
export function toSearchParams(query?: QueryParams): string {
  if (!query) return ''
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value)
        if (item !== undefined && item !== null) params.append(key, String(item))
    } else {
      params.append(key, String(value))
    }
  }

  const serialised = params.toString()
  return serialised ? `?${serialised}` : ''
}

export interface ApiFetchOptions<TSchema extends z.ZodType> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: QueryParams
  /** Validates `data`. Omit only for endpoints whose payload is genuinely unshaped. */
  schema?: TSchema
  signal?: AbortSignal
}

export interface ApiResult<T> {
  data: T
  meta: Meta | null
}

/**
 * The single fetch call. Returns `{ data, meta }`; throws `ApiError` on anything else.
 */
export async function apiFetch<TSchema extends z.ZodType>(
  path: string,
  options: ApiFetchOptions<TSchema> = {},
): Promise<ApiResult<z.infer<TSchema>>> {
  const { method = 'GET', body, query, schema, signal } = options
  const url = `${API_BASE_URL}${path}${toSearchParams(query)}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = readToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // The envelope is the cache boundary; TanStack Query owns caching above this.
      cache: 'no-store',
    })
  } catch (error) {
    // A wrong NEXT_PUBLIC_API_BASE_URL lands here. It must read as a clean ApiError,
    // not a crash — that is the proof the seam holds.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({
      code: 'NETWORK_ERROR',
      status: 0,
      message: `Could not reach the API at ${API_BASE_URL}. Check the connection and NEXT_PUBLIC_API_BASE_URL.`,
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError({
      code: 'BAD_RESPONSE',
      status: response.status,
      message: `The API returned a non-JSON response (HTTP ${response.status}).`,
    })
  }

  const envelope = payload as { data?: unknown; meta?: unknown; error?: unknown }

  if (envelope?.error) {
    const parsed = apiErrorSchema.safeParse(envelope.error)
    const err: ApiErrorBody = parsed.success
      ? parsed.data
      : { code: 'UNKNOWN', message: 'The API returned an error in an unexpected shape.' }
    throw new ApiError({
      code: err.code,
      message: err.message,
      status: response.status,
      fields: err.fields,
    })
  }

  if (!response.ok) {
    throw new ApiError({
      code: 'HTTP_ERROR',
      status: response.status,
      message: `The API returned HTTP ${response.status}.`,
    })
  }

  if (!('data' in (envelope ?? {}))) {
    throw new ApiError({
      code: 'CONTRACT_VIOLATION',
      status: response.status,
      message: 'The API response was missing its `data` envelope key.',
    })
  }

  if (!schema) {
    return { data: envelope.data as z.infer<TSchema>, meta: (envelope.meta as Meta | null) ?? null }
  }

  const parsed = schema.safeParse(envelope.data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.length ? first.path.map(String).join('.') : '(root)'
    throw new ApiError({
      code: 'CONTRACT_VIOLATION',
      status: response.status,
      message: `The API response did not match the contract at \`${where}\`: ${first?.message ?? 'unknown issue'}.`,
    })
  }

  return { data: parsed.data as z.infer<TSchema>, meta: (envelope.meta as Meta | null) ?? null }
}
