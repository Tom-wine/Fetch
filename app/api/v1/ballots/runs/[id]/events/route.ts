import { advance } from '@/lib/mock/ballot-engine'
import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * GET /ballots/runs/:id/events?since=<seq>&limit=200 — the append-only cursor feed.
 *
 * This is the piece §B4 says not to get wrong, so it is worth being explicit about the
 * contract it keeps:
 *
 *   · ONLY events with `seq > since` come back. Not `>=`. A client that echoes back the
 *     cursor it was given must receive nothing, or the second page repeats the first
 *     row forever.
 *   · They come back IN ORDER, ascending by seq.
 *   · `meta.lastSeq` is the cursor for the next call — the seq of the last event in
 *     THIS response, not the run's high-water mark. Returning the high-water mark
 *     while truncating at `limit` would skip everything in between.
 *   · When nothing is new, `data` is empty and `lastSeq` is unchanged, so the cursor
 *     never goes backwards (§B7 rule 5).
 *
 * The client therefore never deduplicates. If it has to, this endpoint lied.
 *
 * A page reload starts from `since=0` and replays the whole run, which is why events
 * are kept rather than trimmed.
 */
const DEFAULT_LIMIT = 200
const MAX_LIMIT = 500

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, (url) => {
    const state = store.ballotRuns.get(id)
    if (!state) return notFound(`Run ${id}`)

    // Advance first: the events this call is about may not exist yet.
    advance(state)

    const sinceRaw = Number(url.searchParams.get('since') ?? 0)
    const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? Math.floor(sinceRaw) : 0

    const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : DEFAULT_LIMIT),
    )

    const fresh = state.events
      .filter((e) => e.seq > since)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)

    // The cursor is where THIS response ends, so a truncated page resumes exactly
    // where it stopped rather than jumping to the run's newest event.
    const lastSeq = fresh.length ? fresh[fresh.length - 1]!.seq : since

    return ok(fresh, {
      page: 1,
      pageSize: limit,
      total: fresh.length,
      totalPages: 1,
      lastSeq,
      hasMore: state.run.lastEventSeq > lastSeq,
    })
  })
}
