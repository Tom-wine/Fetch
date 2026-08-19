import { advance } from '@/lib/mock/ballot-engine'
import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { RunEvent } from '@/lib/types'

/**
 * GET /ballots/runs/:id/events?since=<seq>&limit=200 — the append-only cursor feed.
 *
 * This is the piece §B4 says not to get wrong, so it is worth being explicit about the
 * contract it keeps:
 *
 *   · ONLY events with `seq > since` come back. Not `>=`. A client that echoes back the
 *     cursor it was given must receive nothing, or the second page repeats the first
 *     row forever.
 *   · They come back IN ORDER, ascending by seq -- and because the engine sorts a
 *     batch by timestamp before it numbers it, ascending by seq is also ascending in
 *     time. `assertChronological` below is the tripwire for that second claim.
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

/**
 * Dev-only: shout if the log ever runs backwards in time again.
 *
 * `seq` ascending is guaranteed by construction. `at` non-decreasing is NOT -- it is a
 * property of the engine sorting its pending transitions before numbering them
 * (lib/mock/ballot-engine.ts, `flushEvents`), and the day that comes undone the RUN_LOG
 * silently starts showing an operator a false chronology on the one screen whose job is
 * explaining a failure. That is exactly the kind of regression a screenshot does not
 * catch, so it gets a check rather than a comment.
 *
 * It walks the whole log, not just the page: every batch this endpoint can return is a
 * window on that array, so this covers the batch AND the seams between batches, which
 * is where a per-sweep sort would still leave a hole. It logs rather than throws --
 * a wrong ORDER should not turn into a 500 on a screen someone is using to watch a run.
 */
function assertChronological(events: RunEvent[], runId: string): void {
  if (process.env.NODE_ENV === 'production') return

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1]!
    const current = events[i]!
    if (Date.parse(current.at) < Date.parse(prev.at)) {
      console.error(
        `[ballots] Event log for ${runId} goes backwards in time: ` +
          `seq=${prev.seq} ${prev.at} (${prev.code}) is followed by ` +
          `seq=${current.seq} ${current.at} (${current.code}). ` +
          'The engine must sort pending transitions by timestamp before assigning seq.',
      )
      return
    }
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, (url) => {
    const state = store.ballotRuns.get(id)
    if (!state) return notFound(`Run ${id}`)

    // Advance first: the events this call is about may not exist yet.
    advance(state)
    assertChronological(state.events, id)

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
