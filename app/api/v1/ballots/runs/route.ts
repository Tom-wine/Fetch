import { runCreateSchema } from '@/lib/api/schemas'
import { advance, buildTasks, emptyCounts } from '@/lib/mock/ballot-engine'
import { ERROR_CODES, fail, handle, listQuery, ok, paginate, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import { getClub } from '@/lib/registries/clubs'
import { BALLOT_CLUB_IDS, type BallotClubId, type BallotRun } from '@/lib/types'

/**
 * GET /ballots/runs — the history (§B5.3).
 *
 * Every run is advanced before it is listed, because "where is this run now" is a
 * question about the clock, not about the last time someone opened it. A run seeded
 * three days ago arrives finished; one started forty minutes ago arrives mid-flight.
 */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const now = Date.now()
    const rows: BallotRun[] = []

    for (const state of store.ballotRuns.values()) {
      advance(state, now)
      rows.push(state.run)
    }

    const statuses = url.searchParams.getAll('status').filter(Boolean)
    const filtered = statuses.length ? rows.filter((r) => statuses.includes(r.status)) : rows

    const { data, meta } = paginate(filtered, listQuery(url), {
      searchable: ['label', 'id', 'profileName'],
      defaultSort: 'startedAt',
    })
    return ok(data, meta)
  })
}

/**
 * POST /ballots/runs — create AND start (§B4). There is no separate start call: a run
 * that exists but has not begun is a state with no meaning to an operator.
 */
export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => runCreateSchema.safeParse(v))
    if (!body.ok) return body.response

    const { clubIds, profileId, accountIds, label } = body.value

    const profile = store.ballotProfiles.find((p) => p.id === profileId)
    if (!profile) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'That profile no longer exists.', {
        profileId: ['Choose a profile that still exists.'],
      })
    }

    if (profile.otpSource === 'imap' && !profile.imapId) {
      return fail(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        'This profile reads codes from IMAP but has no IMAP account set.',
        { profileId: ['Set an IMAP account on the profile, or change its OTP source.'] },
      )
    }

    const eligible = store.accounts.filter(
      (a) =>
        (clubIds as string[]).includes(a.club) &&
        (!accountIds?.length || accountIds.includes(a.id)),
    )

    if (!eligible.length) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'No accounts match that selection.', {
        accountIds: ['Load some accounts for these clubs first.'],
      })
    }

    const id = newId('run')
    const startedAt = new Date().toISOString()

    const run: BallotRun = {
      id,
      label: label?.trim() || defaultLabel(clubIds),
      clubIds,
      profileId: profile.id,
      // Denormalised on purpose: a profile renamed next week must not rewrite the
      // history of a run that already happened.
      profileName: profile.name,
      status: 'QUEUED',
      counts: emptyCounts(eligible.length),
      startedAt,
      ratePerMin: 0,
      lastEventSeq: 0,
    }

    store.ballotRuns.set(id, {
      run,
      tasks: buildTasks(
        id,
        eligible.map((a) => ({ id: a.id, email: a.email, club: a.club })),
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

/** `Arsenal · Chelsea — 18 Aug 14:02`. Club names render verbatim (§3.3b). */
function defaultLabel(clubIds: BallotClubId[]): string {
  const names = clubIds
    .filter((id) => BALLOT_CLUB_IDS.includes(id))
    .map((id) => getClub(id).short)
    .join(' · ')
  const when = new Date().toISOString().slice(5, 16).replace('T', ' ')
  return `${names} — ${when}`
}
