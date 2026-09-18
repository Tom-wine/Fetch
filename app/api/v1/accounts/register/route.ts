import { registrationCreateSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Account, CardRef, ImapAccount } from '@/lib/types'

/**
 * POST /accounts/register — register one membership from the full data set.
 *
 * This is the rich sibling of POST /accounts: it accepts the whole membership
 * superset (identity, address, tokenized payment) and mints a `membershipNumber`,
 * standing in for the number a real registration would come back with.
 *
 * What it deliberately does NOT accept: a full card number or a CVV. The payload's
 * `cards` carry a label, last four and expiry only — the client derives `last4` and
 * drops the rest before submitting. A real backend swaps `last4` for a processor
 * token; it must never persist a PAN or a CVV. See docs/BACKEND-HANDOFF.md.
 */

/** A plausible club-assigned membership number: three-letter club prefix + digits. */
function mintMembershipNumber(club: string): string {
  const prefix = club.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  store.sequence += 7
  const digits = ((store.sequence * 2654435761) >>> 0).toString().slice(0, 8).padStart(8, '0')
  return `${prefix}-${digits}`
}

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => registrationCreateSchema.safeParse(v))
    if (!body.ok) return body.response

    const input = body.value

    if (store.accounts.some((a) => a.email.toLowerCase() === input.email.toLowerCase())) {
      return fail(409, ERROR_CODES.VALIDATION_ERROR, 'That email already has an account.', {
        email: ['An account with this email already exists.'],
      })
    }

    // Link a mailbox if the operator gave one, reusing an existing row by address.
    let imapId: string | undefined
    if (input.imapEmail) {
      const existing = store.imapAccounts.find(
        (m) => m.email.toLowerCase() === input.imapEmail!.toLowerCase(),
      )
      if (existing) {
        imapId = existing.id
      } else {
        const mailbox: ImapAccount = {
          id: newId('imap'),
          email: input.imapEmail,
          host: `imap.${input.imapEmail.split('@')[1] ?? 'mail.com'}`,
          status: 'ok',
        }
        store.imapAccounts.unshift(mailbox)
        imapId = mailbox.id
        if (input.imapPassword) store.passwords.set(mailbox.id, input.imapPassword)
      }
    }

    const cards: CardRef[] | undefined = input.cards?.map((c) => ({
      id: newId('card'),
      label: c.label,
      brand: c.brand,
      last4: c.last4,
      expMonth: c.expMonth,
      expYear: c.expYear,
      cardholder: c.cardholder,
      billingSameAsMember: c.billingSameAsMember,
    }))

    const account: Account = {
      id: newId('acc'),
      email: input.email,
      passwordMasked: '•'.repeat(Math.min(14, Math.max(8, input.password.length))),
      club: input.club,
      provider: input.provider ?? 'club-direct',
      membershipId: input.membershipId ?? '',
      membershipNumber: input.membershipNumber || mintMembershipNumber(input.club),
      membershipType: input.membershipType ?? 'official-member',
      loyaltyPoints: input.loyaltyPoints,
      credits: input.credits,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      gender: input.gender,
      nationality: input.nationality,
      phone: input.phone,
      altPhone: input.altPhone,
      dateOfBirth: input.dateOfBirth,
      recoveryEmail: input.recoveryEmail || undefined,
      username: input.username,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      postcode: input.postcode,
      county: input.county,
      country: input.country,
      cards: cards && cards.length > 0 ? cards : undefined,
      status: 'needs_login',
      proxyId: input.proxyId,
      imapId,
      ticketsPurchased: 0,
      tags: input.tags ?? [],
      notes: input.notes,
      createdAt: new Date().toISOString(),
    }

    store.accounts.unshift(account)
    store.passwords.set(account.id, input.password)

    return ok(account)
  })
}
