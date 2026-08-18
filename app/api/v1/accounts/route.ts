import { accountCreateSchema, idsSchema } from '@/lib/api/schemas'
import {
  ERROR_CODES,
  fail,
  handle,
  listQuery,
  multi,
  ok,
  paginate,
  readJson,
} from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Account } from '@/lib/types'

/**
 * GET    /accounts  — list + filter + sort + paginate
 * POST   /accounts  — create one (manual entry)
 * DELETE /accounts  — bulk delete `{ ids: [] }`
 *
 * The password is never returned; only `passwordMasked`. The plaintext lives in a
 * side table that only /accounts/:id/reveal reads.
 */

export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)

    // Repeated keys mean OR (§6.2).
    const clubs = multi(url, 'club')
    const statuses = multi(url, 'status')
    const types = multi(url, 'membershipType')
    const tags = multi(url, 'tag')
    const proxyIds = multi(url, 'proxyId')

    const rows = store.accounts.filter((a) => {
      if (clubs.length && !clubs.includes(a.club)) return false
      if (statuses.length && !statuses.includes(a.status)) return false
      if (types.length && !types.includes(a.membershipType)) return false
      if (tags.length && !tags.some((t) => a.tags.includes(t))) return false
      if (proxyIds.length && (!a.proxyId || !proxyIds.includes(a.proxyId))) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['email', 'firstName', 'lastName', 'membershipId'],
      defaultSort: 'email',
    })

    return ok(data, meta)
  })
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => accountCreateSchema.safeParse(v))
    if (!body.ok) return body.response

    const input = body.value
    if (store.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
      return fail(409, ERROR_CODES.VALIDATION_ERROR, 'That email already has an account.', {
        email: ['An account with this email already exists.'],
      })
    }

    const account: Account = {
      id: newId('acc'),
      email: input.email,
      // The plaintext goes to the side table and is never echoed back.
      passwordMasked: '•'.repeat(Math.min(14, Math.max(8, input.password.length))),
      club: input.club,
      provider: input.provider ?? 'club-direct',
      membershipId: input.membershipId ?? '',
      membershipType: input.membershipType ?? 'official-member',
      loyaltyPoints: input.loyaltyPoints,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      status: 'needs_login',
      proxyId: input.proxyId,
      ticketsPurchased: 0,
      tags: input.tags ?? [],
      notes: input.notes,
      createdAt: new Date().toISOString(),
    }

    store.accounts.unshift(account)
    store.passwords.set(account.id, input.password)

    // Mutations return the full resource so the client can replace the cache entry.
    return ok(account)
  })
}

export async function DELETE(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => idsSchema.safeParse(v))
    if (!body.ok) return body.response

    const ids = new Set(body.value.ids)
    const before = store.accounts.length
    store.accounts = store.accounts.filter((a) => !ids.has(a.id))
    for (const id of ids) store.passwords.delete(id)

    return ok({ affected: before - store.accounts.length, ids: [...ids] })
  })
}
