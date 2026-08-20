'use client'

import * as React from 'react'
import { Copy, Lock, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/domain/StatusChip'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/data/states'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  toProfileInput,
  useBallotProfiles,
  useCreateBallotProfile,
  useDeleteBallotProfile,
  useUpdateBallotProfile,
} from '@/lib/api/hooks/useBallots'
import type { BallotProfileInput } from '@/lib/api/schemas'
import type { BallotProfile } from '@/lib/types'
import { LG, useMediaQuery } from '@/lib/use-media-query'

import { NoProfileChosen } from './empty-states'
import { BLANK_PROFILE, ProfileForm } from './ProfileForm'

/**
 * §B5.2 — `// profiles`. List on the left, form on the right; under `lg` the form is
 * a dialog, because a two-column layout at 375px is one column with the form pushed
 * off the bottom of a list the operator then has to scroll past.
 *
 * The `Default` profile ships and cannot be deleted. Its Delete is disabled with a
 * reason attached rather than hidden — an action that vanishes is a bug report, an
 * action that explains itself is an answer. The API refuses it too, so the rule holds
 * for a caller that never sees this screen.
 */

const PROTECTED_PROFILE_ID = 'bpf_default'

type Draft =
  | { mode: 'edit'; profile: BallotProfile; input: BallotProfileInput }
  | { mode: 'create'; profile: null; input: BallotProfileInput }

export function ProfilesTab() {
  // A real media query rather than `lg:hidden` on the dialog: a hidden Radix dialog
  // still mounts its overlay, traps focus and locks scrolling, so the wide layout
  // would sit dimmed behind an invisible modal.
  const wide = useMediaQuery(LG)

  const query = useBallotProfiles({ pageSize: 100, sort: 'name', order: 'asc' })
  const profiles = React.useMemo(() => query.data?.data ?? [], [query.data])

  const create = useCreateBallotProfile()
  const update = useUpdateBallotProfile()
  const remove = useDeleteBallotProfile()

  const [draft, setDraft] = React.useState<Draft | null>(null)
  const [deleting, setDeleting] = React.useState<BallotProfile | null>(null)

  // Opening the screen on a profile rather than an empty pane: there is always at
  // least the shipped one, and an empty right-hand column teaches nothing.
  React.useEffect(() => {
    if (draft || profiles.length === 0) return
    const first = profiles[0]!
    setDraft({ mode: 'edit', profile: first, input: toProfileInput(first) })
  }, [profiles, draft])

  const startCreate = () => setDraft({ mode: 'create', profile: null, input: { ...BLANK_PROFILE } })

  const startEdit = (profile: BallotProfile) =>
    setDraft({ mode: 'edit', profile, input: toProfileInput(profile) })

  /**
   * `Duplicate` is a create, not a server-side clone: the copy arrives in the form
   * with an editable name so it can be told apart from its source before it exists.
   */
  const startDuplicate = (profile: BallotProfile) =>
    setDraft({
      mode: 'create',
      profile: null,
      input: { ...toProfileInput(profile), name: `${profile.name} copy` },
    })

  const saving = create.isPending || update.isPending

  const submit = (input: BallotProfileInput) => {
    if (!draft) return

    if (draft.mode === 'create') {
      create.mutate(input, {
        onSuccess: (result) =>
          setDraft({ mode: 'edit', profile: result.data, input: toProfileInput(result.data) }),
      })
    } else {
      update.mutate(
        { id: draft.profile.id, input },
        {
          onSuccess: (result) =>
            setDraft({ mode: 'edit', profile: result.data, input: toProfileInput(result.data) }),
        },
      )
    }
  }

  if (query.error) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const form = draft ? (
    <ProfileForm
      value={draft.input}
      editing={draft.profile}
      saving={saving}
      onSubmit={submit}
      onCancel={draft.mode === 'create' ? () => setDraft(null) : undefined}
    />
  ) : (
    <NoProfileChosen />
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <section className="min-w-0 rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <SectionLabel>profiles</SectionLabel>
          <Button variant="ghost" size="sm" label="New" onClick={startCreate}>
            <Plus aria-hidden="true" />
          </Button>
        </header>

        {query.isPending ? (
          <ul className="space-y-2 p-3">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-16 w-full rounded-md" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="max-h-[640px] space-y-1 overflow-y-auto p-2">
            {profiles.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                active={draft?.profile?.id === profile.id}
                onEdit={() => startEdit(profile)}
                onDuplicate={() => startDuplicate(profile)}
                onDelete={() => setDeleting(profile)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* The form, side by side from `lg` up. */}
      {wide && (
        <section className="min-w-0 rounded-lg border border-border bg-surface p-5">
          {draft && (
            <header className="mb-5 border-b border-border pb-4">
              <SectionLabel>{draft.mode === 'create' ? 'new_profile' : 'edit'}</SectionLabel>
              {/* A profile name is the operator's own words — verbatim. */}
              <h2 className="mt-1 truncate font-display text-h2 text-text">
                {draft.profile?.name ?? draft.input.name ?? 'New profile'}
              </h2>
            </header>
          )}
          {form}
        </section>
      )}

      {/* Under `lg` the same form is a dialog over the list. */}
      <Dialog
        open={!wide && draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null)
        }}
      >
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>{draft?.profile ? draft.profile.name : 'New profile'}</DialogTitle>
            <DialogDescription>
              How fast a run goes, how it handles a code, and what it does when a club starts
              refusing.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-5">{form}</div>
        </DialogContent>
      </Dialog>

      {/* §B7 rule 6 — the confirmation names what it removes. */}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        verb="Delete"
        count={1}
        noun="profile"
        title={deleting ? `Delete ${deleting.name}?` : 'Delete profile?'}
        description="Runs that already used it keep their settings — a run records the profile's name when it starts. Only future runs lose the option."
        onConfirm={() => {
          if (deleting) {
            remove.mutate({ id: deleting.id, name: deleting.name })
            if (draft?.profile?.id === deleting.id) setDraft(null)
          }
          setDeleting(null)
        }}
      />
    </div>
  )
}

function ProfileRow({
  profile,
  active,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  profile: BallotProfile
  active: boolean
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const protectedProfile = profile.id === PROTECTED_PROFILE_ID

  return (
    <li>
      <div
        className={cn(
          'group relative rounded-md border px-3 py-2.5 transition-colors duration-150',
          active
            ? 'border-primary/30 bg-primary/8'
            : 'border-transparent hover:border-border hover:bg-surface-hover',
        )}
      >
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full min-w-0 flex-col items-start gap-1 pr-8 text-left"
        >
          <span className="flex w-full min-w-0 items-center gap-2">
            {/* Verbatim: the operator named this. */}
            <span className="truncate text-body font-semibold text-text">{profile.name}</span>
            {protectedProfile && (
              <Chip tone="neutral" className="shrink-0">
                <Lock className="size-2.5" aria-hidden="true" />
                DEFAULT
              </Chip>
            )}
          </span>

          {/* Directly under the name, where a description belongs. A row of icon
              buttons used to sit between the two, so the sentence that explains the
              profile read as a caption on the toolbar rather than on the thing. */}
          {profile.notes && (
            <Prose className="line-clamp-2 text-caption text-muted">{profile.notes}</Prose>
          )}

          <span className="font-mono text-caption text-faint">
            {`${profile.concurrency} at once · ${profile.delayMinMs / 1000}–${profile.delayMaxMs / 1000}s · ${profile.maxRetries} ${profile.maxRetries === 1 ? 'retry' : 'retries'}`}
          </span>
        </button>

        {/*
          One menu instead of three buttons, and a red trash can that is no longer
          permanently visible one click from deletion on a list people scan. It appears
          on hover and on keyboard focus; below `sm` there is no hover, so it stays.
        */}
        <div className="absolute top-2 right-2 opacity-100 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Actions for ${profile.name}`}>
                <MoreVertical className="size-3.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border bg-surface">
              <DropdownMenuItem onSelect={onEdit} className="gap-2 text-body">
                <Pencil className="size-4" aria-hidden="true" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate} className="gap-2 text-body">
                <Copy className="size-4" aria-hidden="true" />
                <span>Duplicate</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDelete}
                disabled={protectedProfile}
                className="gap-2 text-body text-danger-ink"
                // Disabled without a reason is a bug report; with one it is an answer.
                title={
                  protectedProfile
                    ? 'The default profile cannot be deleted. Duplicate it and edit the copy instead.'
                    : undefined
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  )
}
