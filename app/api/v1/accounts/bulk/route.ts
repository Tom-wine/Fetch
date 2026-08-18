import { z } from 'zod'
import { accountCreateSchema } from '@/lib/api/schemas'
import { handle, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Account } from '@/lib/types'

/**
 * POST /accounts/bulk — bulk create from parsed CSV rows → `{ created, updated, skipped, errors[] }`.
 *
 * `onDuplicate` mirrors the choice the import wizard offers on a row that already
 * exists: skip it, or update the existing account in place (§8.3 step 3).
 */
const bodySchema = z.object({
  rows: z.array(accountCreateSchema.partial().extend({ email: z.string() })).min(1),
  onDuplicate: z.enum(['skip', 'update']).default('skip'),
})

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => bodySchema.safeParse(v))
    if (!body.ok) return body.response

    const { rows, onDuplicate } = body.value
    let created = 0
    let updated = 0
    let skipped = 0
    const errors: Array<{ row: number; email?: string; message: string }> = []

    rows.forEach((row, i) => {
      const rowNumber = i + 1

      if (!row.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) {
        errors.push({
          row: rowNumber,
          email: row.email,
          message: 'The email is missing or malformed.',
        })
        return
      }
      if (!row.password) {
        errors.push({ row: rowNumber, email: row.email, message: 'The password is missing.' })
        return
      }
      if (!row.club) {
        errors.push({
          row: rowNumber,
          email: row.email,
          message: 'The club is missing or not recognised.',
        })
        return
      }

      const existing = store.accounts.find(
        (a) => a.email.toLowerCase() === row.email!.toLowerCase(),
      )

      if (existing) {
        if (onDuplicate === 'skip') {
          skipped++
          return
        }
        Object.assign(existing, {
          club: row.club,
          membershipId: row.membershipId ?? existing.membershipId,
          membershipType: row.membershipType ?? existing.membershipType,
          loyaltyPoints: row.loyaltyPoints ?? existing.loyaltyPoints,
          tags: row.tags ?? existing.tags,
        })
        store.passwords.set(existing.id, row.password)
        updated++
        return
      }

      const account: Account = {
        id: newId('acc'),
        email: row.email,
        passwordMasked: '•'.repeat(Math.min(14, Math.max(8, row.password.length))),
        club: row.club,
        provider: row.provider ?? 'club-direct',
        membershipId: row.membershipId ?? '',
        membershipType: row.membershipType ?? 'official-member',
        loyaltyPoints: row.loyaltyPoints,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        status: 'needs_login',
        proxyId: row.proxyId,
        ticketsPurchased: 0,
        tags: row.tags ?? [],
        notes: row.notes,
        createdAt: new Date().toISOString(),
      }

      store.accounts.unshift(account)
      store.passwords.set(account.id, row.password)
      created++
    })

    return ok({ created, updated, skipped, errors })
  })
}
