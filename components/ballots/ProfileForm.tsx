'use client'

import * as React from 'react'
import Link from 'next/link'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Prose, SectionLabel } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ballotProfileInputSchema, type BallotProfileInput } from '@/lib/api/schemas'
import { useImapAccounts } from '@/lib/api/hooks/useBallots'
import { useProxies } from '@/lib/api/hooks/useDashboard'
import type { BallotProfile, Proxy } from '@/lib/types'

/**
 * §B5.2 — the profile form, grouped by `// section_label`.
 *
 * Validation is `ballotProfileInputSchema`, the SAME schema the API route parses. The
 * two rules that are easy to get wrong — `delayMin <= delayMax`, and IMAP required
 * once `otpSource` is `imap` — live there as refinements rather than here, so they
 * hold for any caller and the form cannot drift from the endpoint.
 *
 * Milliseconds are the model's unit (§B3) but nobody thinks in them, so the delay and
 * timeout fields are entered in seconds and converted at the boundary. The stored
 * value is unchanged; only the input is human.
 */

export const NONE = '__none__'

/** Sensible starting point for a new profile — the shipped defaults, minus the name. */
export const BLANK_PROFILE: BallotProfileInput = {
  name: '',
  delayMinMs: 2000,
  delayMaxMs: 5000,
  concurrency: 8,
  maxRetries: 2,
  timeoutMs: 30000,
  otpSource: 'none',
  stopOnRateLimit: true,
}

export function ProfileForm({
  /** The profile being edited, or a pre-filled input for a new one. */
  value,
  /** Set when editing — drives the heading and the submit label. */
  editing,
  saving,
  onSubmit,
  onCancel,
  className,
}: {
  value: BallotProfileInput
  editing: BallotProfile | null
  saving: boolean
  onSubmit: (input: BallotProfileInput) => void
  onCancel?: () => void
  className?: string
}) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BallotProfileInput>({
    resolver: zodResolver(ballotProfileInputSchema),
    defaultValues: value,
  })

  // Switching rows in the list replaces the form's subject, so the fields have to
  // follow. Without this the operator edits row A's values under row B's heading.
  const subject = editing?.id ?? value.name
  React.useEffect(() => reset(value), [subject, reset]) // eslint-disable-line react-hooks/exhaustive-deps

  const otpSource = watch('otpSource')
  const concurrency = Number(watch('concurrency')) || 0
  const proxyGroupId = watch('proxyGroupId')

  const proxiesQuery = useProxies({ pageSize: 200 })
  const proxies = React.useMemo(() => proxiesQuery.data?.data ?? [], [proxiesQuery.data])
  const groups = React.useMemo(() => groupProxies(proxies), [proxies])

  const imapQuery = useImapAccounts()
  const imapAccounts = imapQuery.data?.data ?? []

  const chosenGroup = groups.find((group) => group.id === proxyGroupId)
  const thinProxies = chosenGroup !== undefined && chosenGroup.live < concurrency

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('flex min-h-0 flex-col gap-6', className)}
    >
      <Field label="Name" htmlFor="profile-name" error={errors.name?.message} required>
        <Input
          id="profile-name"
          // A profile name is the operator's own words — verbatim, never snake_cased.
          placeholder="Slow and quiet"
          autoComplete="off"
          className="border-border bg-surface"
          {...register('name')}
        />
      </Field>

      <Group label="pacing">
        <div className="grid gap-4 sm:grid-cols-2">
          <SecondsField
            id="profile-delay-min"
            label="Delay min"
            error={errors.delayMinMs?.message}
            hint="Shortest pause between two entries on the same worker."
            control={control}
            name="delayMinMs"
          />
          <SecondsField
            id="profile-delay-max"
            label="Delay max"
            error={errors.delayMaxMs?.message}
            hint="The gap is drawn at random between the two."
            control={control}
            name="delayMaxMs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Concurrency"
            htmlFor="profile-concurrency"
            error={errors.concurrency?.message}
          >
            <Input
              id="profile-concurrency"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              className="border-border bg-surface font-mono"
              {...register('concurrency', { valueAsNumber: true })}
            />
            {/* §B5.2 asks for this note verbatim, and it is chrome, so it keeps the
                `//` prefix. It is a hint, not an error — §B7 rule 3 only forbids the
                prefix on messages that explain a failure. */}
            <p
              className={cn(
                'font-mono text-caption',
                concurrency > 10 ? 'text-warning-ink' : 'text-faint',
              )}
            >
              {'// above 10, clubs start rate limiting'}
            </p>
          </Field>

          <SecondsField
            id="profile-timeout"
            label="Timeout"
            error={errors.timeoutMs?.message}
            hint="How long one entry may take before it counts as failed."
            control={control}
            name="timeoutMs"
          />
        </div>
      </Group>

      <Group label="retries">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Max retries"
            htmlFor="profile-retries"
            error={errors.maxRetries?.message}
            hint="A retried account is attempted again from scratch."
          >
            <Input
              id="profile-retries"
              type="number"
              min={0}
              max={5}
              inputMode="numeric"
              className="border-border bg-surface font-mono"
              {...register('maxRetries', { valueAsNumber: true })}
            />
          </Field>

          <Controller
            control={control}
            name="stopOnRateLimit"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label className="font-mono text-label text-muted uppercase">
                  {upperSnake('Stop on rate limit')}
                </Label>
                <div className="flex h-10 items-center gap-3">
                  <Switch
                    id="profile-stop-rate-limit"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label
                    htmlFor="profile-stop-rate-limit"
                    className="font-prose text-prose text-muted"
                  >
                    {field.value
                      ? 'The run stops the first time a club refuses for going too fast.'
                      : 'The run carries on past a refusal and keeps going.'}
                  </Label>
                </div>
              </div>
            )}
          />
        </div>
      </Group>

      <Group label="network">
        <Controller
          control={control}
          name="proxyGroupId"
          render={({ field }) => (
            <Field
              label="Proxy group"
              error={errors.proxyGroupId?.message}
              hint={
                thinProxies
                  ? undefined
                  : 'Entries are spread across the group. Leave it as None to go direct.'
              }
            >
              <Select
                value={field.value ?? NONE}
                onValueChange={(next) => field.onChange(next === NONE ? undefined : next)}
              >
                <SelectTrigger
                  aria-label="Proxy group"
                  className="h-10 w-full border-border bg-surface text-body"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface">
                  <SelectItem value={NONE} className="text-body">
                    None
                  </SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id} className="text-body">
                      {group.label} — {group.live} of {group.total} live
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {thinProxies && (
                <Warning>
                  {`This group has ${chosenGroup.live} live ${chosenGroup.live === 1 ? 'proxy' : 'proxies'} for a concurrency of ${concurrency}. Several accounts will share an address, which is what clubs look for.`}
                </Warning>
              )}
            </Field>
          )}
        />
      </Group>

      <Group label="otp">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="otpSource"
            render={({ field }) => (
              <Field label="OTP source" error={errors.otpSource?.message}>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-label="Where two-factor codes come from"
                    className="h-10 w-full border-border bg-surface text-body"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value="none" className="text-body">
                      None — accounts that never ask for a code
                    </SelectItem>
                    <SelectItem value="manual" className="text-body">
                      Manual — someone types the code in
                    </SelectItem>
                    <SelectItem value="imap" className="text-body">
                      IMAP — read from a mailbox
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {/* Appears ONLY for `imap`, and is required once it does (§B5.2). The
              requirement is enforced by the schema, so it holds on the API too. */}
          {otpSource === 'imap' && (
            <Controller
              control={control}
              name="imapId"
              render={({ field }) => (
                <Field label="IMAP account" error={errors.imapId?.message} required>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      aria-label="Mailbox the codes arrive in"
                      className="h-10 w-full border-border bg-surface text-body"
                    >
                      <SelectValue placeholder="Choose a mailbox" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-surface">
                      {imapAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} className="text-body">
                          {/* An address is domain data — verbatim. */}
                          {account.email}
                          {account.status === 'error' && ' — not answering'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {imapQuery.isPending ? (
                    <p className="flex items-center gap-1.5 text-caption text-faint">
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                      Loading mailboxes.
                    </p>
                  ) : imapAccounts.length === 0 ? (
                    <Warning>
                      No mailbox is configured, so a run using this profile cannot read a code.{' '}
                      <Link href="/accounts?tab=imap" className="underline underline-offset-4">
                        Add one on the accounts screen
                      </Link>
                      .
                    </Warning>
                  ) : null}
                </Field>
              )}
            />
          )}
        </div>
      </Group>

      <Group label="notify">
        <Field
          label="Webhook URL"
          htmlFor="profile-webhook"
          error={errors.webhookUrl?.message}
          hint="Optional. Called once when the run finishes."
        >
          <Input
            id="profile-webhook"
            type="url"
            placeholder="https://hooks.example.com/fetch"
            autoComplete="off"
            className="border-border bg-surface font-mono"
            {...register('webhookUrl')}
          />
        </Field>

        <Field label="Notes" htmlFor="profile-notes" error={errors.notes?.message}>
          <textarea
            id="profile-notes"
            rows={2}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-prose text-prose text-text placeholder:text-faint"
            placeholder="What this profile is for."
            {...register('notes')}
          />
        </Field>
      </Group>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="submit" label={editing ? 'Save changes' : 'Create profile'} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            label="Cancel"
            onClick={onCancel}
            disabled={saving}
          />
        )}
        {isDirty && !saving && <Prose className="text-caption text-faint">Unsaved changes.</Prose>}
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ pieces */

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">{label}</legend>
      <SectionLabel aria-hidden="true">{label}</SectionLabel>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="font-mono text-label text-muted uppercase">
        {upperSnake(label)}
        {required && (
          <span className="ml-1 text-danger-ink" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        // A plain sentence, inline, under the field it belongs to. Never `//`-prefixed
        // and never a toast (§B7 rule 3).
        <p role="alert" className="font-prose text-prose text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="font-prose text-prose text-faint">{hint}</p>
      ) : null}
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

/**
 * Milliseconds in the model, seconds in the field.
 *
 * `delayMinMs: 2000` is the contract; "2" is what an operator setting a pace between
 * entries actually thinks. The conversion happens here and nowhere else, so nothing
 * downstream has to remember which unit it is holding.
 */
function SecondsField({
  id,
  label,
  hint,
  error,
  control,
  name,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  control: ReturnType<typeof useForm<BallotProfileInput>>['control']
  name: 'delayMinMs' | 'delayMaxMs' | 'timeoutMs'
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} htmlFor={id} error={error} hint={hint}>
          <div className="relative">
            <Input
              id={id}
              type="number"
              min={0}
              step={0.5}
              inputMode="decimal"
              className="border-border bg-surface pr-8 font-mono"
              value={field.value === undefined ? '' : String(field.value / 1000)}
              onChange={(event) => {
                const seconds = Number(event.target.value)
                field.onChange(Number.isFinite(seconds) ? Math.round(seconds * 1000) : Number.NaN)
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-caption text-faint"
            >
              s
            </span>
          </div>
        </Field>
      )}
    />
  )
}

export interface ProxyGroup {
  id: string
  label: string
  total: number
  live: number
}

/**
 * Proxy groups, derived from the proxies themselves.
 *
 * There is no `/proxy-groups` endpoint and adding one would be a backend change for a
 * facet. The live count is what §B5.2 asks to show and what the launcher warns
 * against, so it is computed here once and read by both.
 */
export function groupProxies(proxies: Proxy[]): ProxyGroup[] {
  const byGroup = new Map<string, ProxyGroup>()

  for (const proxy of proxies) {
    const group = byGroup.get(proxy.groupId) ?? {
      id: proxy.groupId,
      label: proxy.groupId,
      total: 0,
      live: 0,
    }
    group.total++
    if (proxy.status === 'ok') group.live++
    byGroup.set(proxy.groupId, group)
  }

  return [...byGroup.values()].sort((a, b) => a.label.localeCompare(b.label))
}
