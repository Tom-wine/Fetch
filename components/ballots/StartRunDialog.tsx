'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { ClubBadge } from '@/components/domain/ClubBadge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/lib/api/hooks/useAccounts'
import { useBallotProfiles, useCreateRun, useImapAccounts } from '@/lib/api/hooks/useBallots'
import { useProxies } from '@/lib/api/hooks/useDashboard'
import { upperSnake } from '@/lib/format/text'
import { BALLOT_CLUB_IDS, type Account, type BallotClubId, type BallotProfile } from '@/lib/types'

import { groupProxies } from './ProfileForm'
import { formatEstimate } from './vocabulary'

/**
 * §B5.4 — the launcher.
 *
 * Three blocks on one screen and no stepper. A stepper would hide the estimate behind
 * the scope choice, and the estimate is the whole point: the mistake this dialog exists
 * to prevent is starting 312 accounts at yesterday's concurrency because nobody looked.
 *
 * Every number here is real. The account count is the server's `meta.total` for the
 * chosen clubs, not a guess; the profile summary is the profile's stored settings, not
 * the form's defaults; the estimate is recomputed from both on every change.
 */

type ScopeMode = 'selection' | 'all'

export function StartRunDialog({
  open,
  onOpenChange,
  /** The accounts chosen on the pool tab, or null if the launcher was opened cold. */
  selection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selection: Account[] | null
}) {
  const router = useRouter()
  const createRun = useCreateRun()

  const hasSelection = Boolean(selection?.length)

  /** Clubs the selection covers, or all seven when there is no selection. */
  const selectionClubs = React.useMemo(
    () =>
      selection?.length
        ? [...new Set(selection.map((a) => a.club as BallotClubId))].filter((c) =>
            BALLOT_CLUB_IDS.includes(c),
          )
        : [],
    [selection],
  )

  const [clubIds, setClubIds] = React.useState<BallotClubId[]>(BALLOT_CLUB_IDS)
  const [scope, setScope] = React.useState<ScopeMode>('all')
  const [profileId, setProfileId] = React.useState<string>('')
  const [label, setLabel] = React.useState('')

  // Reset on every open: a dialog that remembers last time's clubs is a dialog that
  // starts the wrong run when someone hits Enter out of habit.
  React.useEffect(() => {
    if (!open) return
    setScope(hasSelection ? 'selection' : 'all')
    setClubIds(hasSelection && selectionClubs.length ? selectionClubs : BALLOT_CLUB_IDS)
    setLabel('')
  }, [open, hasSelection, selectionClubs])

  /* ---------------------------------------------------------------- scope */

  /**
   * The real count for the chosen clubs. One row is requested because this needs
   * `meta.total`, not the accounts — the run's account set is resolved server-side.
   */
  const eligible = useAccounts({ club: clubIds, pageSize: 1 })
  const eligibleTotal = eligible.data?.meta?.total ?? 0

  const selectionInClubs = React.useMemo(
    () => (selection ?? []).filter((a) => clubIds.includes(a.club as BallotClubId)),
    [selection, clubIds],
  )

  const accountCount = scope === 'selection' ? selectionInClubs.length : eligibleTotal

  /* -------------------------------------------------------------- profile */

  const profilesQuery = useBallotProfiles({ pageSize: 100, sort: 'name', order: 'asc' })
  const profiles = React.useMemo(() => profilesQuery.data?.data ?? [], [profilesQuery.data])

  React.useEffect(() => {
    if (profileId || profiles.length === 0) return
    setProfileId(profiles.find((p) => p.id === 'bpf_default')?.id ?? profiles[0]!.id)
  }, [profiles, profileId])

  const profile = profiles.find((p) => p.id === profileId) ?? null

  /* --------------------------------------------------------------- blocks */

  const proxiesQuery = useProxies({ pageSize: 200 })
  const proxyGroups = React.useMemo(
    () => groupProxies(proxiesQuery.data?.data ?? []),
    [proxiesQuery.data],
  )
  const proxyGroup = profile?.proxyGroupId
    ? (proxyGroups.find((g) => g.id === profile.proxyGroupId) ?? null)
    : null

  const imapQuery = useImapAccounts()
  const imapAccounts = imapQuery.data?.data ?? []

  /**
   * A hard block, not a warning: a run whose profile reads codes from a mailbox that
   * does not exist will stall on the first account that asks for one, twenty minutes
   * from now, with nobody able to say why (§B5.4). The API refuses it too.
   */
  const imapMissing =
    profile?.otpSource === 'imap' &&
    !imapQuery.isPending &&
    (!profile.imapId || !imapAccounts.some((a) => a.id === profile.imapId))

  /** A warning, not a block: sharing an address is a risk the operator may accept. */
  const thinProxies =
    profile !== null && proxyGroup !== null && proxyGroup.live < profile.concurrency

  const estimateSeconds = profile ? estimate(accountCount, profile) : 0
  const blocked = accountCount === 0 || !profile || imapMissing

  const submit = () => {
    if (blocked || !profile) return

    createRun.mutate(
      {
        clubIds,
        profileId: profile.id,
        // Explicit ids only when a selection is being run: omitting them is what
        // tells the server "every eligible account in these clubs", which stays
        // right even if the pool grew since this dialog opened.
        accountIds: scope === 'selection' ? selectionInClubs.map((a) => a.id) : undefined,
        label: label.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          onOpenChange(false)
          router.push(`/ballots/run/${result.data.id}`)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[680px]">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Start a run</DialogTitle>
          <DialogDescription>
            Every chosen account is entered into its club&apos;s ballot, one after another, at the
            pace the profile sets. Nothing is submitted until you press start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-5 py-5">
          {/* ------------------------------------------------------- scope */}
          <section className="space-y-3">
            <SectionLabel>scope</SectionLabel>

            <div className="flex flex-wrap gap-1.5">
              {BALLOT_CLUB_IDS.map((club) => {
                const on = clubIds.includes(club)
                return (
                  <button
                    key={club}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setClubIds((current) =>
                        current.includes(club)
                          ? current.filter((c) => c !== club)
                          : [...current, club],
                      )
                    }
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors duration-150',
                      on
                        ? 'border-primary/40 bg-primary/10 text-text'
                        : 'border-border bg-surface text-muted hover:border-border-strong hover:text-text',
                    )}
                  >
                    <ClubBadge club={club} variant="short" size="sm" />
                  </button>
                )
              })}
            </div>

            {clubIds.length === 0 && (
              <Prose className="text-prose text-warning-ink">
                Choose at least one club. Accounts are entered into their own club&apos;s ballot.
              </Prose>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <ScopeOption
                active={scope === 'selection'}
                disabled={!hasSelection}
                onSelect={() => setScope('selection')}
                title="Selection"
                count={selectionInClubs.length}
                hint={
                  hasSelection
                    ? 'The accounts ticked on the pool tab.'
                    : 'Nothing is selected on the pool tab.'
                }
              />
              <ScopeOption
                active={scope === 'all'}
                onSelect={() => setScope('all')}
                title="All eligible"
                count={eligibleTotal}
                pending={eligible.isPending}
                hint="Every account in the chosen clubs, resolved when the run starts."
              />
            </div>
          </section>

          {/* ----------------------------------------------------- profile */}
          <section className="space-y-3">
            <SectionLabel>profile</SectionLabel>

            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger
                aria-label="Profile"
                className="h-10 w-full border-border bg-surface text-body"
              >
                <SelectValue placeholder="Choose a profile" />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-body">
                    {/* Profile names are the operator's own words — verbatim. */}
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Read-only, and shown rather than hidden behind a link: §B5.4 exists so
                nobody starts 300 accounts on yesterday's concurrency. */}
            {profile && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border border-border bg-background p-3 font-mono text-caption sm:grid-cols-3">
                <Setting label="Concurrency" value={String(profile.concurrency)} />
                <Setting
                  label="Delay"
                  value={`${profile.delayMinMs / 1000}–${profile.delayMaxMs / 1000}s`}
                />
                <Setting label="Timeout" value={`${profile.timeoutMs / 1000}s`} />
                <Setting label="Max retries" value={String(profile.maxRetries)} />
                <Setting label="OTP source" value={upperSnake(profile.otpSource)} />
                <Setting
                  label="On rate limit"
                  value={profile.stopOnRateLimit ? 'STOP' : 'CARRY_ON'}
                />
                <Setting
                  label="Proxy group"
                  value={proxyGroup ? `${proxyGroup.id} (${proxyGroup.live} live)` : 'NONE'}
                />
              </dl>
            )}

            {imapMissing && (
              <Blocker>
                This profile reads two-factor codes from a mailbox that is no longer configured.
                Point it at one, or change its OTP source, before starting a run.
              </Blocker>
            )}

            {thinProxies && !imapMissing && (
              <Warning>
                {`${proxyGroup.id} has ${proxyGroup.live} live ${proxyGroup.live === 1 ? 'proxy' : 'proxies'} for a concurrency of ${profile.concurrency}. Several accounts will enter from the same address, which is what clubs look for.`}
              </Warning>
            )}
          </section>

          {/* ---------------------------------------------------- estimate */}
          <section className="space-y-3">
            <SectionLabel>estimate</SectionLabel>

            <p className="rounded-md border border-border bg-background px-3 py-2.5 font-mono text-body text-text tabular-nums">
              {profile ? (
                <>
                  {`${accountCount} ${accountCount === 1 ? 'task' : 'tasks'}`}
                  <span className="text-faint"> · </span>
                  {`concurrency ${profile.concurrency}`}
                  <span className="text-faint"> · </span>
                  {`delay ${profile.delayMinMs / 1000}–${profile.delayMaxMs / 1000}s`}
                  <span className="text-faint"> · </span>
                  <span className="font-semibold">≈ {formatEstimate(estimateSeconds)}</span>
                </>
              ) : (
                <span className="text-faint">Choose a profile to see how long this takes.</span>
              )}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="run-label" className="font-mono text-label text-muted uppercase">
                {upperSnake('Label')}
              </Label>
              <Input
                id="run-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Arsenal · Chelsea — members sale"
                autoComplete="off"
                className="border-border bg-surface"
              />
              <p className="font-prose text-prose text-faint">
                Optional. Left blank, the run is named after its clubs and the time it started.
              </p>
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 border-t border-border px-5 py-4">
          <Button
            variant="ghost"
            label="Cancel"
            onClick={() => onOpenChange(false)}
            disabled={createRun.isPending}
          />
          <Button
            label="Start run"
            count={accountCount || undefined}
            forward
            onClick={submit}
            disabled={blocked || createRun.isPending}
            // Disabled with a reason attached rather than silently inert.
            title={
              accountCount === 0
                ? 'No account matches this scope.'
                : imapMissing
                  ? 'This profile has no mailbox to read codes from.'
                  : undefined
            }
          >
            {createRun.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ pieces */

function ScopeOption({
  active,
  disabled = false,
  pending = false,
  onSelect,
  title,
  count,
  hint,
}: {
  active: boolean
  disabled?: boolean
  pending?: boolean
  onSelect: () => void
  title: string
  count: number
  hint: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-150',
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-surface hover:border-border-strong',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className="font-mono text-label text-muted uppercase">
        {upperSnake(title)}
        <span className={cn('ml-1.5', active ? 'text-primary-ink' : 'text-text')}>
          {pending ? '…' : `(${count})`}
        </span>
      </span>
      <span className="font-prose text-caption text-faint">{hint}</span>
    </button>
  )
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-label text-faint uppercase">{upperSnake(label)}</dt>
      <dd className="truncate text-text">{value}</dd>
    </div>
  )
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 font-prose text-prose text-warning-ink">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function Blocker({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-prose text-prose text-danger-ink"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/**
 * How long the run takes, in seconds.
 *
 * `concurrency` workers each take one task after another, and between two tasks a
 * worker waits the average of the profile's delay window. So each worker spends about
 * `attempt + delay` per task, and the run is `tasks / concurrency` of those.
 *
 * `ATTEMPT_MS` is the mean of the engine's own attempt duration — `900 + rand * 2600`
 * in lib/mock/ballot-engine.ts — not the profile's timeout. A timeout is the worst
 * case, and estimating every run at its worst case makes the number useless.
 *
 * Retries are not modelled. Most runs do not retry most accounts, and an estimate that
 * assumes they do is wrong in the common case in order to be right in the rare one.
 * Once the run starts, the run's own `etaSeconds` takes over and is measured from the
 * rate it is actually achieving, which is a better number than this one can be.
 */
const ATTEMPT_MS = 2200

export function estimate(taskCount: number, profile: BallotProfile): number {
  if (taskCount <= 0) return 0
  const perTask = ATTEMPT_MS + (profile.delayMinMs + profile.delayMaxMs) / 2
  const waves = Math.ceil(taskCount / Math.max(1, profile.concurrency))
  return Math.round((waves * perTask) / 1000)
}
