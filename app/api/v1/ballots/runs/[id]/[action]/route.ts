import { advance, buildTasks, emptyCounts, pause, resume, stop } from '@/lib/mock/ballot-engine'
import { ERROR_CODES, fail, handle, notFound, ok } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { BallotRun } from '@/lib/types'

/**
 * POST /ballots/runs/:id/pause · /resume · /stop · /retry-failed (§B4).
 *
 * One route file because they share a path shape, the same way the ticket actions do.
 * Each returns the run, so the client replaces its cache entry wholesale.
 */
const ACTIONS = new Set(['pause', 'resume', 'stop', 'retry-failed'])

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await ctx.params

  return handle(request, () => {
    if (!ACTIONS.has(action)) {
      return fail(404, ERROR_CODES.NOT_FOUND, `There is no '${action}' run action.`)
    }

    const state = store.ballotRuns.get(id)
    if (!state) return notFound(`Run ${id}`)

    if (action === 'pause') return ok(pause(state).run)
    if (action === 'resume') return ok(resume(state).run)
    if (action === 'stop') return ok(stop(state).run)

    // retry-failed: a NEW run containing exactly the previous run's failures, so the
    // original stays a true record of what happened rather than being rewritten.
    advance(state)
    const failed = state.tasks.filter((t) => t.status === 'FAILED')
    if (!failed.length) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'This run has no failed accounts to retry.')
    }

    const profile = store.ballotProfiles.find((p) => p.id === state.run.profileId) ?? state.profile
    const newRunId = newId('run')
    const startedAt = new Date().toISOString()

    const run: BallotRun = {
      id: newRunId,
      label: `${state.run.label} — retry`,
      clubIds: state.run.clubIds,
      profileId: profile.id,
      profileName: profile.name,
      status: 'QUEUED',
      counts: emptyCounts(failed.length),
      startedAt,
      ratePerMin: 0,
      lastEventSeq: 0,
    }

    store.ballotRuns.set(newRunId, {
      run,
      tasks: buildTasks(
        newRunId,
        failed.map((t) => ({ id: t.accountId, email: t.accountEmail, club: t.clubId })),
        profile,
      ),
      events: [],
      profile,
      pausedMs: 0,
      materialised: 0,
    })

    return ok(run)
  })
}
