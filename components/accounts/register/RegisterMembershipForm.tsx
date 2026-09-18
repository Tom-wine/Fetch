'use client'

import * as React from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CreditCard, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import {
  clubIdSchema,
  membershipTypeSchema,
  providerIdSchema,
  type RegistrationCreate,
} from '@/lib/api/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClubSelect } from '@/components/import/ClubSelect'
import { useRegisterMembership } from '@/lib/api/hooks/useAccounts'
import { useProxies } from '@/lib/api/hooks/useDashboard'
import type { ClubId } from '@/lib/types'
import { BRAND_LABEL, brandOf, emptyCard, last4Of, toCardPayload } from './payment'

/**
 * The membership registration flow (§ registration): the full data set for one
 * membership, in one sectioned page. It is the rich sibling of the manual-entry form
 * — that one collects a login; this one collects everything a club registration
 * needs, so no field is missed when the set differs from club to club.
 *
 * TWO RULES, NEITHER DECORATIVE:
 *
 * - PAYMENT IS TOKENIZED AT THE FIELD. The card number the operator types never
 *   enters the submitted payload; `toCardPayload` reduces every card to a label,
 *   last four and expiry. There is no CVV field, by design — no system may store one.
 * - ERRORS ARE INLINE. The submit stays disabled until the three required fields
 *   (club, email, password) are valid, so the button's state is the feedback.
 */

const cardSchema = z.object({
  label: z.string(),
  cardholder: z.string(),
  number: z
    .string()
    .refine((v) => v === '' || /^[\d ]{12,23}$/.test(v), 'A card number is 12–19 digits.'),
  expMonth: z
    .string()
    .refine((v) => v === '' || /^(0?[1-9]|1[0-2])$/.test(v), 'Month is 1–12.'),
  expYear: z.string().refine((v) => v === '' || /^\d{2}$|^\d{4}$/.test(v), 'Year is YY or YYYY.'),
  billingSameAsMember: z.boolean(),
})

const schema = z.object({
  // Membership
  club: clubIdSchema,
  provider: providerIdSchema,
  membershipType: membershipTypeSchema,
  membershipId: z.string(),
  loyaltyPoints: z
    .string()
    .refine((v) => v === '' || /^\d+$/.test(v), 'A whole number.'),
  credits: z.string().refine((v) => v === '' || /^\d+$/.test(v), 'A whole number.'),
  // Login
  email: z.email('That is not a valid email address.'),
  password: z.string().min(1, 'A password is required.'),
  username: z.string(),
  recoveryEmail: z
    .string()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Not a valid email address.'),
  // Identity
  firstName: z.string(),
  middleName: z.string(),
  lastName: z.string(),
  gender: z.string(),
  nationality: z.string(),
  dateOfBirth: z.string(),
  // Contact
  phone: z.string(),
  altPhone: z.string(),
  // Address
  addressLine1: z.string(),
  addressLine2: z.string(),
  city: z.string(),
  postcode: z.string(),
  county: z.string(),
  country: z.string(),
  // Ops
  proxyId: z.string(),
  imapEmail: z
    .string()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Not a valid email address.'),
  imapPassword: z.string(),
  notes: z.string(),
  cards: z.array(cardSchema),
})

type FormValues = z.infer<typeof schema>

const NO_PROXY = '__none__'

function defaults(): FormValues {
  return {
    club: 'liverpool',
    provider: 'club-direct',
    membershipType: 'official-member',
    membershipId: '',
    loyaltyPoints: '',
    credits: '',
    email: '',
    password: '',
    username: '',
    recoveryEmail: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    nationality: '',
    dateOfBirth: '',
    phone: '',
    altPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    county: '',
    country: '',
    proxyId: NO_PROXY,
    imapEmail: '',
    imapPassword: '',
    notes: '',
    cards: [],
  }
}

export function RegisterMembershipForm({ onDone }: { onDone?: () => void }) {
  const register = useRegisterMembership()
  const proxies = useProxies({ pageSize: 100, sort: 'label' }).data?.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: defaults(),
  })

  const {
    control,
    register: field,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = form

  const cards = useFieldArray({ control, name: 'cards' })
  const club = watch('club')

  const pending = register.isPending || isSubmitting

  async function submit(values: FormValues, andAnother: boolean) {
    const payload: RegistrationCreate = {
      email: values.email.trim(),
      password: values.password,
      club: values.club,
      provider: values.provider,
      membershipType: values.membershipType,
      membershipId: values.membershipId.trim() || undefined,
      loyaltyPoints:
        values.club === 'chelsea' && values.loyaltyPoints ? Number(values.loyaltyPoints) : undefined,
      credits:
        values.club === 'liverpool' && values.credits ? Number(values.credits) : undefined,
      username: values.username.trim() || undefined,
      recoveryEmail: values.recoveryEmail.trim() || undefined,
      firstName: values.firstName.trim() || undefined,
      middleName: values.middleName.trim() || undefined,
      lastName: values.lastName.trim() || undefined,
      gender: values.gender.trim() || undefined,
      nationality: values.nationality.trim() || undefined,
      dateOfBirth: values.dateOfBirth.trim() || undefined,
      phone: values.phone.trim() || undefined,
      altPhone: values.altPhone.trim() || undefined,
      addressLine1: values.addressLine1.trim() || undefined,
      addressLine2: values.addressLine2.trim() || undefined,
      city: values.city.trim() || undefined,
      postcode: values.postcode.trim() || undefined,
      county: values.county.trim() || undefined,
      country: values.country.trim() || undefined,
      imapEmail: values.imapEmail.trim() || undefined,
      imapPassword: values.imapPassword || undefined,
      proxyId: values.proxyId !== NO_PROXY ? values.proxyId : undefined,
      notes: values.notes.trim() || undefined,
      // The funnel: every card becomes last4 + expiry here. No PAN, no CVV, leaves.
      cards: values.cards
        .map(toCardPayload)
        .filter((c): c is NonNullable<typeof c> => c !== null),
    }

    await register.mutateAsync(payload)

    if (andAnother) {
      reset({
        ...defaults(),
        club: values.club,
        provider: values.provider,
        membershipType: values.membershipType,
        proxyId: values.proxyId,
      })
      toast.success('Membership registered.')
    } else {
      onDone?.()
    }
  }

  return (
    <form onSubmit={handleSubmit((v) => submit(v, false))} noValidate className="space-y-6">
      <Section title="Membership" hint="What the account is, and the club that issues it.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Club" error={errors.club?.message} required>
            <Controller
              name="club"
              control={control}
              render={({ field: f }) => (
                <ClubSelect
                  value={f.value as ClubId}
                  onChange={f.onChange}
                  invalid={Boolean(errors.club)}
                />
              )}
            />
          </Field>
          <Field label="Membership type" required>
            <Controller
              name="membershipType"
              control={control}
              render={({ field: f }) => (
                <EnumSelect value={f.value} onChange={f.onChange} options={membershipTypeSchema.options} />
              )}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Provider">
            <Controller
              name="provider"
              control={control}
              render={({ field: f }) => (
                <EnumSelect value={f.value} onChange={f.onChange} options={providerIdSchema.options} />
              )}
            />
          </Field>
          <Field label="Client reference" hint="The supporter number the club knows this account by.">
            <TextInput {...field('membershipId')} />
          </Field>
        </div>

        {club === 'chelsea' && (
          <Field
            label="Loyalty points"
            hint="Chelsea loyalty-points balance. Drives the LP tracker."
            error={errors.loyaltyPoints?.message}
          >
            <TextInput inputMode="numeric" invalid={Boolean(errors.loyaltyPoints)} {...field('loyaltyPoints')} />
          </Field>
        )}
        {club === 'liverpool' && (
          <Field
            label="Credits"
            hint="Liverpool ticketing credits balance. Drives the credits tracker."
            error={errors.credits?.message}
          >
            <TextInput inputMode="numeric" invalid={Boolean(errors.credits)} {...field('credits')} />
          </Field>
        )}
      </Section>

      <Section title="Login" hint="How the account signs in to the club site.">
        <Field label="Email" error={errors.email?.message} required>
          <TextInput type="email" autoComplete="off" invalid={Boolean(errors.email)} {...field('email')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message} required>
            <TextInput type="password" autoComplete="new-password" invalid={Boolean(errors.password)} {...field('password')} />
          </Field>
          <Field label="Username" hint="Only if the club login differs from the email.">
            <TextInput {...field('username')} />
          </Field>
        </div>
        <Field label="Recovery email" error={errors.recoveryEmail?.message}>
          <TextInput type="email" invalid={Boolean(errors.recoveryEmail)} {...field('recoveryEmail')} />
        </Field>
      </Section>

      <Section title="Identity" hint="The person the membership belongs to.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="First name">
            <TextInput {...field('firstName')} />
          </Field>
          <Field label="Middle name">
            <TextInput {...field('middleName')} />
          </Field>
          <Field label="Last name">
            <TextInput {...field('lastName')} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date of birth" hint="Any readable format.">
            <TextInput {...field('dateOfBirth')} />
          </Field>
          <Field label="Gender">
            <TextInput {...field('gender')} />
          </Field>
          <Field label="Nationality">
            <TextInput {...field('nationality')} />
          </Field>
        </div>
      </Section>

      <Section title="Contact" hint="Where the club reaches this member.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" hint="Some clubs send their two-factor code here.">
            <TextInput type="tel" {...field('phone')} />
          </Field>
          <Field label="Alt phone">
            <TextInput type="tel" {...field('altPhone')} />
          </Field>
        </div>
      </Section>

      <Section title="Address" hint="The billing and delivery address on file.">
        <Field label="Address line 1">
          <TextInput {...field('addressLine1')} />
        </Field>
        <Field label="Address line 2">
          <TextInput {...field('addressLine2')} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City">
            <TextInput {...field('city')} />
          </Field>
          <Field label="Postcode">
            <TextInput {...field('postcode')} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="County / region">
            <TextInput {...field('county')} />
          </Field>
          <Field label="Country">
            <TextInput {...field('country')} />
          </Field>
        </div>
      </Section>

      <Section
        title="Payment"
        hint="Tokenized. Only a label, the last four digits and the expiry are kept — never the full number, never a CVV."
      >
        <div className="flex items-center gap-2 rounded-md border border-primary/25 bg-primary/8 px-3 py-2 text-caption text-muted">
          <ShieldCheck className="size-4 shrink-0 text-primary-ink" aria-hidden="true" />
          The full number stays in this field and is dropped on save. There is no CVV field.
        </div>

        {cards.fields.map((row, i) => (
          <CardRow
            key={row.id}
            index={i}
            control={control}
            field={field}
            number={watch(`cards.${i}.number`)}
            errors={errors.cards?.[i]}
            onRemove={() => cards.remove(i)}
          />
        ))}

        <Button
          type="button"
          variant="secondary"
          label="Add a card"
          onClick={() => cards.append(emptyCard())}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </Section>

      <Section title="Operations" hint="Optional plumbing and your own labels.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Proxy" hint="Optional.">
            <Controller
              name="proxyId"
              control={control}
              render={({ field: f }) => (
                <Select value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className="h-9 border-border bg-surface text-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface">
                    <SelectItem value={NO_PROXY} className="text-body">
                      No proxy
                    </SelectItem>
                    {proxies.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-body">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="IMAP email" error={errors.imapEmail?.message} hint="The mailbox one-time codes are read from.">
            <TextInput type="email" invalid={Boolean(errors.imapEmail)} {...field('imapEmail')} />
          </Field>
        </div>
        <Field label="IMAP password">
          <TextInput type="password" autoComplete="new-password" {...field('imapPassword')} />
        </Field>
        <Field label="Notes">
          <textarea
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 font-prose text-prose text-text placeholder:text-faint"
            {...field('notes')}
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-raised/95 px-6 py-3 backdrop-blur">
        <p className="mr-auto text-caption text-faint">
          A membership number is assigned on save.
        </p>
        <Button
          type="button"
          variant="secondary"
          label="Save and add another"
          disabled={!isValid || pending}
          onClick={handleSubmit((v) => submit(v, true))}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
        </Button>
        <Button type="submit" variant="gradient" label="Register membership" forward disabled={!isValid || pending} />
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ parts */

function CardRow({
  index,
  field,
  number,
  errors,
  onRemove,
}: {
  index: number
  control: ReturnType<typeof useForm<FormValues>>['control']
  field: ReturnType<typeof useForm<FormValues>>['register']
  number: string
  errors?: FieldErrors<FormValues['cards'][number]>
  onRemove: () => void
}) {
  const digits = (number ?? '').replace(/\D/g, '')
  const preview = digits ? `${BRAND_LABEL[brandOf(number)]} •••• ${last4Of(number) || '····'}` : null

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-raised/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-caption text-muted">
          <CreditCard className="size-4" aria-hidden="true" />
          {preview ?? `Card ${index + 1}`}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove card ${index + 1}`}
          className="text-faint hover:text-danger-ink"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Label" hint="Your own name for the card.">
          <TextInput placeholder="Amex personal" {...field(`cards.${index}.label`)} />
        </Field>
        <Field label="Cardholder">
          <TextInput {...field(`cards.${index}.cardholder`)} />
        </Field>
      </div>

      <Field
        label="Card number"
        hint="Reduced to the last four on save. The rest is never stored."
        error={errors?.number?.message}
      >
        <TextInput inputMode="numeric" autoComplete="off" placeholder="•••• •••• •••• 1234" {...field(`cards.${index}.number`)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Expiry month" error={errors?.expMonth?.message}>
          <TextInput inputMode="numeric" placeholder="MM" {...field(`cards.${index}.expMonth`)} />
        </Field>
        <Field label="Expiry year" error={errors?.expYear?.message}>
          <TextInput inputMode="numeric" placeholder="YYYY" {...field(`cards.${index}.expYear`)} />
        </Field>
      </div>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-6">
      <div className="space-y-1">
        <h2 className="font-mono text-title uppercase text-text">{upperSnake(title)}</h2>
        {hint && <p className="text-prose text-muted">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono text-label text-muted uppercase">
        {upperSnake(label)}
        {required && (
          <span className="ml-1 text-danger-ink" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
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

const TextInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<typeof Input> & { invalid?: boolean }
>(function TextInput({ className, invalid, ...props }, ref) {
  return (
    <Input
      ref={ref}
      spellCheck={false}
      aria-invalid={invalid}
      className={cn('h-9 border-border bg-surface text-body', invalid && 'border-danger/60', className)}
      {...props}
    />
  )
})

function EnumSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 border-border bg-surface text-body">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-border bg-surface">
        {options.map((option) => (
          <SelectItem key={option} value={option} className="text-body">
            {upperSnake(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
