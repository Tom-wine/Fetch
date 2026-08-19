'use client'

import * as React from 'react'
import Link from 'next/link'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { clubIdSchema, membershipTypeSchema } from '@/lib/api/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Prose } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Chip } from '@/components/domain/StatusChip'
import {
  useAccountTags,
  useCreateAccount,
  useEmailDuplicate,
  useUpdateAccount,
} from '@/lib/api/hooks/useAccounts'
import { useProxies } from '@/lib/api/hooks/useDashboard'
import type { Account, ClubId, MembershipType } from '@/lib/types'
import { ClubSelect } from './ClubSelect'

/**
 * Tab A (§8.3) — one account, entered by hand, keyboard-first.
 *
 * Two rules run this form and neither is decoration:
 *
 * - ERRORS ARE INLINE, NEVER IN A TOAST. A toast for a field error puts the message
 *   somewhere other than the thing that is wrong, and then takes it away on a timer.
 *   The submit stays disabled until the form is genuinely valid, so the operator never
 *   presses a button in order to be told what is missing.
 * - THE DUPLICATE CHECK IS LIVE. Finding out an email is taken after typing eleven
 *   more fields is the single most annoying thing a form like this can do, so the
 *   check runs as soon as the address is plausible and links straight to the account
 *   that already has it.
 */

const schema = z.object({
  club: clubIdSchema,
  email: z.email('That is not a valid email address.'),
  password: z.string().min(1, 'A password is required.'),
  membershipType: membershipTypeSchema,
  membershipId: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  loyaltyPoints: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Loyalty points are a whole number.')
    .optional(),
  proxyId: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().trim().optional(),
})

type ManualValues = z.infer<typeof schema>

const NO_PROXY = '__none__'

function defaultsFor(account?: Account | null): ManualValues {
  return {
    club: (account?.club ?? 'arsenal') as ClubId,
    email: account?.email ?? '',
    password: '',
    membershipType: (account?.membershipType ?? 'official-member') as MembershipType,
    membershipId: account?.membershipId ?? '',
    firstName: account?.firstName ?? '',
    lastName: account?.lastName ?? '',
    phone: account?.phone ?? '',
    loyaltyPoints: account?.loyaltyPoints === undefined ? '' : String(account.loyaltyPoints),
    proxyId: account?.proxyId ?? NO_PROXY,
    tags: account?.tags ?? [],
    notes: account?.notes ?? '',
  }
}

export function ManualEntryForm({
  /** Set to edit an existing account instead of creating one. */
  account,
  onDone,
  className,
}: {
  account?: Account | null
  onDone?: () => void
  className?: string
}) {
  const editing = Boolean(account)
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const proxies = useProxies({ pageSize: 100, sort: 'label' }).data?.data ?? []
  const knownTags = useAccountTags().data ?? []

  const emailRef = React.useRef<HTMLInputElement | null>(null)

  const form = useForm<ManualValues>({
    resolver: zodResolver(schema),
    // Validity has to be known before the operator presses anything, because the
    // button's disabled state is the feedback.
    mode: 'onChange',
    defaultValues: defaultsFor(account),
  })

  const {
    control,
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = form

  /* ------------------------------------------------- live duplicate check */

  const email = watch('email')
  const debouncedEmail = useDebounced(email, 350)
  const duplicate = useEmailDuplicate(debouncedEmail)
  // Editing an account is not a collision with itself.
  const collision = duplicate.data && duplicate.data.id !== account?.id ? duplicate.data : null

  const pending = createAccount.isPending || updateAccount.isPending || isSubmitting
  const blocked = !editing && collision !== null

  /* ------------------------------------------------------------- submit */

  async function submit(values: ManualValues, andAnother: boolean) {
    const body = {
      email: values.email.trim(),
      club: values.club,
      membershipType: values.membershipType,
      membershipId: values.membershipId || undefined,
      firstName: values.firstName || undefined,
      lastName: values.lastName || undefined,
      phone: values.phone || undefined,
      loyaltyPoints: values.loyaltyPoints ? Number(values.loyaltyPoints) : undefined,
      proxyId: values.proxyId && values.proxyId !== NO_PROXY ? values.proxyId : undefined,
      tags: values.tags,
      notes: values.notes || undefined,
    }

    if (editing && account) {
      // An empty password field means "leave the stored one alone", not "clear it".
      await updateAccount.mutateAsync({
        id: account.id,
        patch: values.password ? { ...body, password: values.password } : body,
      })
      onDone?.()
      return
    }

    await createAccount.mutateAsync({ ...body, password: values.password })

    if (andAnother) {
      // §8.3: keep the club and the membership type — the two things that are the
      // same for every account in a batch — and clear the identity fields.
      reset({
        ...defaultsFor(null),
        club: values.club,
        membershipType: values.membershipType,
        proxyId: values.proxyId,
        tags: values.tags,
      })
      toast.success('Account added.')
      // After the reset, so focus lands on the cleared field rather than the old one.
      window.setTimeout(() => setFocus('email'), 0)
    } else {
      onDone?.()
    }
  }

  return (
    <form
      onSubmit={handleSubmit((values) => submit(values, false))}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      noValidate
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Club" htmlFor="manual-club" error={errors.club?.message} required>
            <Controller
              name="club"
              control={control}
              render={({ field }) => (
                <ClubSelect
                  id="manual-club"
                  value={field.value}
                  onChange={field.onChange}
                  invalid={Boolean(errors.club)}
                />
              )}
            />
          </Field>

          <Field
            label="Membership type"
            htmlFor="manual-membership-type"
            error={errors.membershipType?.message}
            required
          >
            <Controller
              name="membershipType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="manual-membership-type"
                    className="h-9 border-border bg-surface text-body"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    {membershipTypeSchema.options.map((option) => (
                      <SelectItem key={option} value={option} className="text-body">
                        {upperSnake(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="manual-email" error={errors.email?.message} required>
          <Input
            id="manual-email"
            type="email"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(errors.email)}
            className={cn(
              'h-9 border-border bg-surface text-body',
              errors.email && 'border-danger/60',
            )}
            {...register('email')}
            ref={(element) => {
              register('email').ref(element)
              emailRef.current = element
            }}
          />
          <DuplicateNotice checking={duplicate.isFetching} account={collision} editing={editing} />
        </Field>

        <Field
          label={editing ? 'New password' : 'Password'}
          htmlFor="manual-password"
          error={errors.password?.message}
          required={!editing}
          hint={editing ? 'Leave this empty to keep the stored password.' : undefined}
        >
          <Input
            id="manual-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className={cn(
              'h-9 border-border bg-surface text-body',
              errors.password && 'border-danger/60',
            )}
            {...register('password')}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="manual-first" error={errors.firstName?.message}>
            <Input
              id="manual-first"
              className="h-9 border-border bg-surface text-body"
              {...register('firstName')}
            />
          </Field>
          <Field label="Last name" htmlFor="manual-last" error={errors.lastName?.message}>
            <Input
              id="manual-last"
              className="h-9 border-border bg-surface text-body"
              {...register('lastName')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Client reference"
            htmlFor="manual-membership-id"
            error={errors.membershipId?.message}
            hint="The supporter number the club knows this account by."
          >
            <Input
              id="manual-membership-id"
              className="h-9 border-border bg-surface text-body"
              {...register('membershipId')}
            />
          </Field>
          <Field label="Phone" htmlFor="manual-phone" error={errors.phone?.message}>
            <Input
              id="manual-phone"
              type="tel"
              className="h-9 border-border bg-surface text-body"
              {...register('phone')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Loyalty points"
            htmlFor="manual-loyalty"
            error={errors.loyaltyPoints?.message}
          >
            <Input
              id="manual-loyalty"
              inputMode="numeric"
              aria-invalid={Boolean(errors.loyaltyPoints)}
              className={cn(
                'h-9 border-border bg-surface text-body',
                errors.loyaltyPoints && 'border-danger/60',
              )}
              {...register('loyaltyPoints')}
            />
          </Field>

          <Field label="Proxy" htmlFor="manual-proxy" hint="Optional.">
            <Controller
              name="proxyId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? NO_PROXY} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="manual-proxy"
                    className="h-9 border-border bg-surface text-body"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value={NO_PROXY} className="text-body">
                      No proxy
                    </SelectItem>
                    {proxies.map((proxy) => (
                      <SelectItem key={proxy.id} value={proxy.id} className="text-body">
                        {proxy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field label="Tags" htmlFor="manual-tags">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagsInput value={field.value} onChange={field.onChange} suggestions={knownTags} />
            )}
          />
        </Field>

        <Field label="Notes" htmlFor="manual-notes" error={errors.notes?.message}>
          <textarea
            id="manual-notes"
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-prose text-prose text-text placeholder:text-faint"
            {...register('notes')}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-raised px-6 py-3">
        {!editing && (
          <Button
            type="button"
            variant="secondary"
            label="Save and add another"
            disabled={!isValid || pending || blocked}
            onClick={handleSubmit((values) => submit(values, true))}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
          </Button>
        )}

        <Button
          type="submit"
          variant="gradient"
          label={editing ? 'Save changes' : 'Save'}
          forward
          disabled={!isValid || pending || blocked}
        />
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ parts */

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
      {/* Inline, under the field it belongs to. Never a toast. */}
      {error ? (
        <p role="alert" className="font-prose text-prose text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="font-prose text-prose text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

function DuplicateNotice({
  checking,
  account,
  editing,
}: {
  checking: boolean
  account: Account | null
  editing: boolean
}) {
  if (checking) {
    return (
      <p className="flex items-center gap-1.5 text-caption text-faint">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Checking whether this address is already in use.
      </p>
    )
  }

  if (!account) return null

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/12 px-3 py-2"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-ink" aria-hidden="true" />
      <Prose className="text-muted">
        {editing
          ? 'Another account already uses this address.'
          : 'This address already has an account. '}
        <Link
          href={`/accounts?q=${encodeURIComponent(account.email)}`}
          className="text-primary-ink underline underline-offset-4"
        >
          Open {account.email}
        </Link>{' '}
        instead, or use a different address.
      </Prose>
    </div>
  )
}

function TagsInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
}) {
  const [draft, setDraft] = React.useState('')
  const unused = suggestions.filter((tag) => !value.includes(tag)).slice(0, 6)

  function add(tag: string) {
    const clean = tag.trim()
    if (!clean || value.includes(clean)) return
    onChange([...value, clean])
    setDraft('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5">
        {value.map((tag) => (
          // Tags are the operator's own words — rendered verbatim, never snake_cased.
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-sm border border-primary/25 bg-primary/12 px-2 py-0.5 text-chip text-primary-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((existing) => existing !== tag))}
              aria-label={`Remove the tag ${tag}`}
              className="text-primary-ink/70 hover:text-primary-ink"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id="manual-tags"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              add(draft)
            } else if (event.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          placeholder={value.length === 0 ? 'Type a tag and press Enter' : ''}
          className="h-7 min-w-[140px] flex-1 bg-transparent text-body text-text outline-none placeholder:text-faint"
        />
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-faint">In use elsewhere:</span>
          {unused.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)}>
              <Chip tone="neutral" className="cursor-pointer hover:border-primary/40">
                {tag}
              </Chip>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Keeps a keystroke from becoming a request. */
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
