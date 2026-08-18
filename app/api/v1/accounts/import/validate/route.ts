import { z } from 'zod'
import { clubIdSchema, membershipTypeSchema } from '@/lib/api/schemas'
import { handle, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { ImportRowVerdict } from '@/lib/types'

/**
 * POST /accounts/import/validate — a server-side dry run of a parsed CSV.
 *
 * The wizard validates client-side too, but the duplicate check against existing
 * accounts can only be answered here, and a real backend would apply its own rules
 * on top. The verdict list drives the §8.3 step-3 counters.
 */
const bodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string().nullable())).min(1),
})

const CLUB_IDS = clubIdSchema.options
const MEMBERSHIP_TYPES = membershipTypeSchema.options

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => bodySchema.safeParse(v))
    if (!body.ok) return body.response

    const seenInFile = new Set<string>()
    const existing = new Set(store.accounts.map((a) => a.email.toLowerCase()))

    const verdicts: ImportRowVerdict[] = body.value.rows.map((row, i) => {
      const messages: string[] = []
      let status: ImportRowVerdict['status'] = 'ok'

      const email = (row.email ?? '').trim()
      const password = (row.password ?? '').trim()
      const club = (row.club ?? '').trim().toLowerCase()

      if (!email) {
        messages.push('The email is missing.')
        status = 'error'
      } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        messages.push('That email is not a valid address.')
        status = 'error'
      }

      if (!password) {
        messages.push('The password is missing.')
        status = 'error'
      }

      if (!club) {
        messages.push('The club is missing.')
        status = 'error'
      } else if (!CLUB_IDS.includes(club as (typeof CLUB_IDS)[number])) {
        const suggestion = suggestClub(club)
        messages.push(
          suggestion
            ? `'${row.club}' is not a club we recognise. Did you mean ${suggestion}?`
            : `'${row.club}' is not one of the 20 Premier League clubs.`,
        )
        status = 'error'
      }

      if (email) {
        const key = email.toLowerCase()
        if (seenInFile.has(key)) {
          messages.push('This email appears earlier in the file.')
          status = 'error'
        } else {
          seenInFile.add(key)
          if (existing.has(key)) {
            messages.push('An account with this email already exists. Skip it, or update it.')
            if (status === 'ok') status = 'warning'
          }
        }
      }

      const membershipType = (row.membership_type ?? '').trim()
      if (
        membershipType &&
        !MEMBERSHIP_TYPES.includes(membershipType as (typeof MEMBERSHIP_TYPES)[number])
      ) {
        messages.push(
          `'${membershipType}' is not a membership type; it will fall back to official-member.`,
        )
        if (status === 'ok') status = 'warning'
      }

      const loyalty = (row.loyalty_points ?? '').trim()
      if (loyalty && !/^\d+$/.test(loyalty)) {
        messages.push('The loyalty points are not a number and will be dropped.')
        if (status === 'ok') status = 'warning'
      }

      const proxy = (row.proxy ?? '').trim()
      if (proxy && proxy.split(':').length !== 4) {
        messages.push('The proxy is not host:port:user:pass and will be dropped.')
        if (status === 'ok') status = 'warning'
      }

      return { row: i + 1, status, email: email || undefined, messages }
    })

    return ok(verdicts)
  })
}

/** Cheap fuzzy match, so "Man Utd" can offer "man-utd" as a one-click fix (§8.3). */
function suggestClub(input: string): string | null {
  const normalised = input.replace(/[^a-z]/g, '')
  let best: { id: string; score: number } | null = null

  for (const id of CLUB_IDS) {
    const target = id.replace(/[^a-z]/g, '')
    let score = 0
    if (target.startsWith(normalised.slice(0, 3))) score += 2
    if (target.includes(normalised) || normalised.includes(target)) score += 3
    for (const ch of new Set(normalised)) if (target.includes(ch)) score++
    if (!best || score > best.score) best = { id, score }
  }

  return best && best.score >= 5 ? best.id : null
}
