import { ticketActionSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import { getClub } from '@/lib/registries/clubs'
import type { Listing, Ticket } from '@/lib/types'

/**
 * POST /tickets/group · /list · /transfer · /share — the §8.5 Actions menu.
 *
 * Each returns the full set of updated tickets so the client replaces those cache
 * entries wholesale; `list` additionally returns the listings it created.
 */
const ACTIONS = new Set(['group', 'list', 'transfer', 'share'])

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params

  return handle(request, async () => {
    if (!ACTIONS.has(action)) {
      return fail(404, ERROR_CODES.NOT_FOUND, `There is no '${action}' ticket action.`)
    }

    const body = await readJson(request, (v) => ticketActionSchema.safeParse(v))
    if (!body.ok) return body.response

    const { ids, platform, price } = body.value
    const selected = store.tickets.filter((t) => ids.includes(t.id))
    if (!selected.length) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'None of those tickets exist.', {
        ids: ['No matching tickets.'],
      })
    }

    const updated: Ticket[] = []
    const createdListings: Listing[] = []

    if (action === 'group') {
      const groupId = newId('grp')
      for (const t of selected) {
        const next = { ...t, groupId }
        replace(next)
        updated.push(next)
      }
    }

    if (action === 'list') {
      if (!platform) {
        return fail(422, ERROR_CODES.VALIDATION_ERROR, 'Choose a marketplace first.', {
          platform: ['A marketplace is required to create a listing.'],
        })
      }
      for (const t of selected) {
        const next = { ...t, status: 'listed' as const }
        replace(next)
        updated.push(next)

        const fixture = store.fixtures.find((f) => f.id === t.fixtureId)
        const listing: Listing = {
          id: newId('lst'),
          listingId: `${platform.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-8)}`,
          platform,
          accountId: t.accountId,
          fixtureId: t.fixtureId,
          fixtureName: fixture
            ? `${getClub(fixture.homeClub).short} v ${getClub(fixture.awayClub).short}`
            : t.fixtureId,
          kickoff: fixture?.kickoff ?? new Date().toISOString(),
          price: price ?? t.price,
          currency: t.currency,
          block: t.block,
          quantity: 1,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        }
        store.listings.unshift(listing)
        createdListings.push(listing)
      }
    }

    if (action === 'transfer') {
      for (const t of selected) {
        const next = { ...t, status: 'transferred' as const }
        replace(next)
        updated.push(next)
      }
    }

    if (action === 'share') {
      // Sharing does not change ownership; it publishes a QR link, so the only
      // visible change is that the seat becomes visible to the buyer.
      for (const t of selected) {
        const next = { ...t, visibility: 'visible' as const }
        replace(next)
        updated.push(next)
      }
    }

    return ok({ tickets: updated, listings: createdListings })
  })
}

function replace(next: Ticket) {
  const i = store.tickets.findIndex((t) => t.id === next.id)
  if (i !== -1) store.tickets[i] = next
}
