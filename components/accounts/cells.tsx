'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Chip } from '@/components/domain/StatusChip'
import { PasswordCell } from '@/components/domain/PasswordCell'
import { useRevealPassword } from '@/lib/api/hooks/useAccounts'
import type { Account, Proxy, ProxyStatus } from '@/lib/types'

/** `j.moreau@mail.com` + `Julien Moreau` under it, behind initials (§8.2 ACCOUNT). */
export function AccountIdentity({ account }: { account: Account }) {
  const name = [account.firstName, account.lastName].filter(Boolean).join(' ')

  return (
    // Capped, not fluid: an email is the widest thing in the table and left to
    // itself it pushes the ACTIONS column off the right edge at 1440.
    <div className="flex max-w-[200px] min-w-0 items-center gap-2.5">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-caption font-semibold text-muted">
          {initialsOf(account)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        {/* Emails and people's names are domain data — verbatim, never snake_cased. */}
        <div className="truncate text-body text-text">{account.email}</div>
        {name && <div className="truncate text-caption text-faint">{name}</div>}
      </div>
    </div>
  )
}

export function initialsOf(account: Account): string {
  const first = account.firstName?.[0]
  const last = account.lastName?.[0]
  if (first || last) return `${first ?? ''}${last ?? ''}`.toUpperCase()
  return account.email.slice(0, 2).toUpperCase()
}

/** Membership type as a chip, client reference in mono underneath (§8.2 MEMBERSHIP). */
export function MembershipCell({ account }: { account: Account }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Chip tone="neutral">{upperSnake(account.membershipType)}</Chip>
      {account.membershipId && (
        <span className="truncate font-mono text-caption text-muted">{account.membershipId}</span>
      )}
    </div>
  )
}

const PROXY_DOT: Record<ProxyStatus, string> = {
  ok: 'bg-success',
  dead: 'bg-danger',
  untested: 'bg-neutral-chip',
}

const PROXY_HINT: Record<ProxyStatus, string> = {
  ok: 'responded on its last test',
  dead: 'did not respond on its last test',
  untested: 'has never been tested',
}

/** Label + status dot (§8.2 PROXY). An unassigned account reads as a dash, not blank. */
export function ProxyCell({ proxy }: { proxy: Proxy | undefined }) {
  if (!proxy) return <span className="text-faint">—</span>

  return (
    <span
      className="inline-flex min-w-0 items-center gap-2"
      title={`${proxy.label} ${PROXY_HINT[proxy.status]}.`}
    >
      <span
        className={cn('size-2 shrink-0 rounded-full', PROXY_DOT[proxy.status])}
        aria-hidden="true"
      />
      <span className="truncate text-body text-muted">{proxy.label}</span>
      <span className="sr-only">{PROXY_HINT[proxy.status]}</span>
    </span>
  )
}

/**
 * A component rather than an inline closure because `useRevealPassword` is a hook
 * and a cell renderer is not a component body. The revealed value is returned
 * straight into the cell's own state and never enters the query cache.
 */
export function AccountPasswordCell({ account }: { account: Account }) {
  const revealFor = useRevealPassword()
  // A fixed-length mask, not the server's. `passwordMasked` is one bullet per
  // character, which quietly publishes every password's length in a column anyone
  // can read over a shoulder — and it makes the column's width depend on the
  // secret. Ten bullets for everyone tells the reader the same true thing (there is
  // a password) without the extra fact.
  return <PasswordCell masked={MASK} onReveal={revealFor(account.id)} />
}

const MASK = '•'.repeat(10)
