import { advance } from '@/lib/mock/ballot-engine'
import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { BallotTask } from '@/lib/types'

/**
 * GET /ballots/accounts/results — the last ballot result per account.
 *
 * Not in the §B4 table, because §B4 describes runs and this describes accounts. It
 * exists for the two columns §B5.1 adds to the pool table, `LAST_RUN` and
 * `LAST_RESULT`, which are "the account's most recent BallotTask" — a join across
 * every run.
 *
 * The alternative was to do that join in the component: fetch the run list, then a
 * page of tasks per run, then reduce. That is a request per run on a screen that
 * already has one, it grows with the history rather than with what is on screen, and
 * it puts a server-side join in a React file where the next person will not find it.
 *
 * The whole map comes back rather than a slice keyed by the visible page: it is one
 * small object, it caches once for the screen instead of re-fetching on every page
 * change, and it avoids putting 200 account ids in a query string.
 */
export async function GET(request: Request) {
  return handle(request, () => {
    const now = Date.now()
    const latest = new Map<string, { task: BallotTask; runId: string; runLabel: string }>()

    for (const state of store.ballotRuns.values()) {
      advance(state, now)

      for (const task of state.tasks) {
        // QUEUED is not a result — an account waiting in a live run has not been
        // attempted yet, and showing it as its "last result" would be a lie.
        if (task.status === 'QUEUED') continue

        const held = latest.get(task.accountId)
        if (!held || task.updatedAt > held.task.updatedAt) {
          latest.set(task.accountId, {
            task,
            runId: state.run.id,
            runLabel: state.run.label,
          })
        }
      }
    }

    const rows = [...latest.values()].map(({ task, runId, runLabel }) => ({
      accountId: task.accountId,
      runId,
      runLabel,
      at: task.updatedAt,
      status: task.status,
      httpStatus: task.lastHttpStatus,
      message: task.lastMessage,
      entryRef: task.entryRef,
    }))

    return ok(rows)
  })
}
