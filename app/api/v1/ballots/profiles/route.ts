import { ballotProfileInputSchema } from '@/lib/api/schemas'
import { handle, listQuery, ok, paginate, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { BallotProfile } from '@/lib/types'

/** GET /ballots/profiles — the profile list (§B4). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const { data, meta } = paginate(store.ballotProfiles, listQuery(url), {
      searchable: ['name', 'notes'],
      defaultSort: 'name',
    })
    return ok(data, meta)
  })
}

/** POST /ballots/profiles — create. */
export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => ballotProfileInputSchema.safeParse(v))
    if (!body.ok) return body.response

    const now = new Date().toISOString()
    const profile: BallotProfile = {
      id: newId('bpf'),
      ...body.value,
      // An empty string is what a cleared optional field sends. Store absence instead,
      // so `webhookUrl` is either a URL or missing and never the empty string.
      webhookUrl: body.value.webhookUrl || undefined,
      createdAt: now,
      updatedAt: now,
    }
    store.ballotProfiles.unshift(profile)
    return ok(profile)
  })
}
