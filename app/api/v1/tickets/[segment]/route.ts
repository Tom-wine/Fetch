import { ticketActionSchema, ticketPatchSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, notFound, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Ticket } from '@/lib/types'

/**
 * One dynamic segment, two meanings.
 *
 * `POST /tickets/group | transfer | share` is the §8.5 Actions menu, and `PATCH /tickets/:id` edits one seat. Those are
 * the same path shape — `/tickets/share` and `/tickets/tkt_014` cannot be told apart
 * by a router — so Next.js gives them one route file and the segment is named for
 * neither. The method decides which it is.
 *
 * Every POST returns the full set of updated tickets so the client replaces those
 * cache entries wholesale.
 */
const ACTIONS = new Set(['group', 'transfer', 'share'])

export async function POST(request: Request, ctx: { params: Promise<{ segment: string }> }) {
  const { segment: action } = await ctx.params

  return handle(request, async () => {
    if (!ACTIONS.has(action)) {
      return fail(404, ERROR_CODES.NOT_FOUND, `There is no '${action}' ticket action.`)
    }

    const body = await readJson(request, (v) => ticketActionSchema.safeParse(v))
    if (!body.ok) return body.response

    const { ids } = body.value
    const selected = store.tickets.filter((t) => ids.includes(t.id))
    if (!selected.length) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'None of those tickets exist.', {
        ids: ['No matching tickets.'],
      })
    }

    const updated: Ticket[] = []

    if (action === 'group') {
      const groupId = newId('grp')
      for (const t of selected) {
        const next = { ...t, groupId }
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

    return ok({ tickets: updated })
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

function replace(next: Ticket) {
  const i = store.tickets.findIndex((t) => t.id === next.id)
  if (i !== -1) store.tickets[i] = next
}
