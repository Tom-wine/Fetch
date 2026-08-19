import { ticketActionSchema, ticketPatchSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, notFound, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import { getClub } from '@/lib/registries/clubs'
import type { Listing, Ticket } from '@/lib/types'

/**
 * One dynamic segment, two meanings.
 *
 * `POST /tickets/group | list | associate-listing | resell-face-value | transfer |
 * share` is the §8.5 Actions menu, and `PATCH /tickets/:id` edits one seat. Those are
 * the same path shape — `/tickets/share` and `/tickets/tkt_014` cannot be told apart
 * by a router — so Next.js gives them one route file and the segment is named for
 * neither. The method decides which it is.
 *
 * Every POST returns the full set of updated tickets so the client replaces those
 * cache entries wholesale, plus any listings it created.
 */
const ACTIONS = new Set([
  'group',
  'list',
  'associate-listing',
  'resell-face-value',
  'transfer',
  'share',
])

/** The club's own resale channel. Face value only — see `PlatformInfo.kind`. */
const CLUB_EXCHANGE = 'club-exchange' as const

export async function POST(request: Request, ctx: { params: Promise<{ segment: string }> }) {
  const { segment: action } = await ctx.params

  return handle(request, async () => {
    if (!ACTIONS.has(action)) {
      return fail(404, ERROR_CODES.NOT_FOUND, `There is no '${action}' ticket action.`)
    }

    const body = await readJson(request, (v) => ticketActionSchema.safeParse(v))
    if (!body.ok) return body.response

    const { ids, platform, price, listingId } = body.value
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
        const listing = buildListing(t, platform, price ?? t.price)
        store.listings.unshift(listing)
        createdListings.push(listing)

        const next = { ...t, status: 'listed' as const, listingId: listing.listingId }
        replace(next)
        updated.push(next)
      }
    }

    /**
     * The seats are already for sale somewhere Fetch.io did not create the listing —
     * an operator listed them by hand, or another tool did. This LINKS that listing
     * rather than minting a second one: `list` would create a new marketplace id and
     * throw away the reference the operator typed in.
     */
    if (action === 'associate-listing') {
      if (!listingId) {
        return fail(422, ERROR_CODES.VALIDATION_ERROR, 'Enter the listing id to link.', {
          listingId: ['A marketplace listing id is required.'],
        })
      }

      const wanted = listingId.trim().toLowerCase()
      const existing = store.listings.find((l) => l.listingId.toLowerCase() === wanted)
      if (!existing) {
        return fail(422, ERROR_CODES.VALIDATION_ERROR, `No listing ${listingId} was found.`, {
          listingId: ['That listing id does not exist on any marketplace Fetch.io can see.'],
        })
      }

      // A listing belongs to one fixture. Linking a seat to a listing for another
      // match would produce a row that cannot be delivered.
      if (selected.some((t) => t.fixtureId !== existing.fixtureId)) {
        return fail(
          422,
          ERROR_CODES.VALIDATION_ERROR,
          `${existing.listingId} is for a different fixture.`,
          { listingId: ['The listing and the selected seats are not for the same match.'] },
        )
      }

      for (const t of selected) {
        const next = { ...t, status: 'listed' as const, listingId: existing.listingId }
        replace(next)
        updated.push(next)
      }
      // Reported so the client can name what it linked, not because it was created.
      createdListings.push(existing)
    }

    /**
     * The club's own exchange, at the price printed on the ticket. There is no price
     * to choose — that is what "face value" means, and it is why this is an action
     * rather than another trip through the marketplace picker.
     */
    if (action === 'resell-face-value') {
      for (const t of selected) {
        const listing = buildListing(t, CLUB_EXCHANGE, t.faceValue)
        store.listings.unshift(listing)
        createdListings.push(listing)

        const next = {
          ...t,
          status: 'listed' as const,
          price: t.faceValue,
          listingId: listing.listingId,
        }
        replace(next)
        updated.push(next)
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

/**
 * PATCH /tickets/:id — edit one seat.
 *
 * The only write that can move `visibility` in BOTH directions; `POST /tickets/share`
 * only ever reveals. Returns the whole ticket, like every other single-resource write
 * in this API, so the client never has to merge a partial.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ segment: string }> }) {
  const { segment: id } = await ctx.params

  return handle(request, async () => {
    const index = store.tickets.findIndex((t) => t.id === id)
    if (index === -1) return notFound(`Ticket ${id}`)

    const body = await readJson(request, (v) => ticketPatchSchema.safeParse(v))
    if (!body.ok) return body.response

    const next = { ...store.tickets[index]!, ...body.value }
    store.tickets[index] = next

    return ok(next)
  })
}

function buildListing(ticket: Ticket, platform: Listing['platform'], price: number): Listing {
  const fixture = store.fixtures.find((f) => f.id === ticket.fixtureId)
  return {
    id: newId('lst'),
    listingId: `${platform.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-8)}`,
    platform,
    accountId: ticket.accountId,
    fixtureId: ticket.fixtureId,
    fixtureName: fixture
      ? `${getClub(fixture.homeClub).short} v ${getClub(fixture.awayClub).short}`
      : ticket.fixtureId,
    kickoff: fixture?.kickoff ?? new Date().toISOString(),
    price,
    currency: ticket.currency,
    block: ticket.block,
    quantity: 1,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  }
}

function replace(next: Ticket) {
  const i = store.tickets.findIndex((t) => t.id === next.id)
  if (i !== -1) store.tickets[i] = next
}
