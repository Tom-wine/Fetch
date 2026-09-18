import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import { sectionsFor } from '@/lib/registries/stadiums'
import type { Seatmap } from '@/lib/types'

/**
 * GET /fixtures/:id/seatmap — the seat map for a fixture's venue.
 *
 * The mock returns a per-stadium SCHEMATIC: the real, named stands of the home club's
 * ground (`format: 'sections'`), which the tab draws around a pitch and tints by the
 * seats the operator owns. It is honest about being a schematic, not a to-scale plan.
 *
 * This is a seam. A real backend can fetch and normalize the provider's published map
 * (Ticketmaster, SecuTix, …) and return it as `format: 'svg'` with an `svg` string and
 * an `attribution`, behind this same endpoint — the tab renders whichever it gets, so
 * no frontend change is needed. See docs/BACKEND-HANDOFF.md.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    const fixture = store.fixtures.find((f) => f.id === id)
    if (!fixture) return notFound('That fixture')

    const seatmap: Seatmap = {
      fixtureId: fixture.id,
      venue: fixture.venue.name,
      format: 'sections',
      sections: sectionsFor(fixture.homeClub),
      source: 'mock-schematic',
      attribution: 'Schematic — stand layout, not a to-scale plan.',
    }

    return ok(seatmap)
  })
}
