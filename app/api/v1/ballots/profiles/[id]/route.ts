import { ballotProfileInputSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, notFound, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** The shipped profile. §B5.2 says it cannot be deleted. */
const PROTECTED_PROFILE_ID = 'bpf_default'

/** PATCH /ballots/profiles/:id — edit. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, async () => {
    const index = store.ballotProfiles.findIndex((p) => p.id === id)
    if (index === -1) return notFound(`Profile ${id}`)

    const body = await readJson(request, (v) => ballotProfileInputSchema.safeParse(v))
    if (!body.ok) return body.response

    const next = {
      ...store.ballotProfiles[index]!,
      ...body.value,
      webhookUrl: body.value.webhookUrl || undefined,
      updatedAt: new Date().toISOString(),
    }
    store.ballotProfiles[index] = next
    return ok(next)
  })
}

/**
 * DELETE /ballots/profiles/:id.
 *
 * The default profile is refused rather than hidden: the UI already disables the
 * action, but a caller that asks anyway gets a reason instead of a silent success.
 * A profile a run has already used is kept too — runs denormalise `profileName`
 * precisely so history survives a rename, and deleting the profile out from under a
 * finished run would leave its settings unexplainable.
 */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    const index = store.ballotProfiles.findIndex((p) => p.id === id)
    if (index === -1) return notFound(`Profile ${id}`)

    if (id === PROTECTED_PROFILE_ID) {
      return fail(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        'The default profile cannot be deleted. Duplicate it and edit the copy instead.',
      )
    }

    const [removed] = store.ballotProfiles.splice(index, 1)
    return ok({ id: removed!.id })
  })
}
