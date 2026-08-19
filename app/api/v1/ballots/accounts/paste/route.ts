import { accountPasteSchema } from '@/lib/api/schemas'
import { handle, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Account } from '@/lib/types'

/**
 * POST /ballots/accounts/paste — the §B5.1 quick loader.
 *
 * One `email:password` per line, with `,` and `;` accepted as separators too, because
 * a spreadsheet export uses whichever the operator's locale picked and re-typing 120
 * lines to fix a delimiter is not work.
 *
 * §B7 rule 2: the block arrives ONCE and is never stored. Passwords go into the same
 * password map every other account uses — never into the response, never into an
 * event, never logged. The response says how many landed, not what they were.
 */
const SEPARATORS = /[:,;]/

interface PasteError {
  row: number
  email?: string
  message: string
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => accountPasteSchema.safeParse(v))
    if (!body.ok) return body.response

    const { club, text } = body.value

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: PasteError[] = []
    const seen = new Set<string>()

    const lines = text.split(/\r?\n/)

    lines.forEach((raw, i) => {
      const row = i + 1
      const line = raw.trim()
      if (!line) return

      const at = line.search(SEPARATORS)
      if (at === -1) {
        errors.push({ row, message: 'No separator. Use email:password, one account per line.' })
        return
      }

      const email = line.slice(0, at).trim().toLowerCase()
      const password = line.slice(at + 1).trim()

      if (!email.includes('@') || email.length < 5) {
        errors.push({ row, email, message: 'That does not look like an email address.' })
        return
      }
      if (!password) {
        errors.push({ row, email, message: 'The password is missing after the separator.' })
        return
      }

      // A duplicate WITHIN the pasted block is reported separately from one that is
      // already in Fetch.io — they are different mistakes and need different fixes.
      if (seen.has(email)) {
        skipped++
        errors.push({ row, email, message: 'Repeated earlier in this paste. Only the first was used.' })
        return
      }
      seen.add(email)

      const existing = store.accounts.find((a) => a.email.toLowerCase() === email)
      if (existing) {
        existing.club = club
        store.passwords.set(existing.id, password)
        updated++
        return
      }

      const id = newId('acc')
      const now = new Date().toISOString()
      const account: Account = {
        id,
        email,
        club,
        provider: 'club-direct',
        membershipType: 'general-sale',
        membershipId: `BAL-${id.slice(-6).toUpperCase()}`,
        status: 'needs_login',
        // Constant width, like everywhere else — one bullet per character would
        // publish every password's length across the table (§B7 rule 2).
        passwordMasked: '••••••••••',
        ticketsPurchased: 0,
        tags: [],
        createdAt: now,
      }
      store.accounts.unshift(account)
      store.passwords.set(id, password)
      created++
    })

    return ok({ created, updated, skipped, errors })
  })
}
