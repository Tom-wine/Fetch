'use client'

import * as React from 'react'

import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { StatusChip } from '@/components/domain/StatusChip'
import { Checkbox } from '@/components/ui/checkbox'
import type { Account } from '@/lib/types'
import { MembershipCell } from './cells'

/**
 * Under `md` the table becomes stacked cards (§9 rule 3): email, club crest, status
 * chip, membership, and the row's own actions menu.
 *
 * The checkbox is here on purpose. DataTable's card layout drops the select column,
 * which would leave the bulk bar unreachable on a phone — and "is anything locked,
 * check them all" is exactly the thing an operator does from a phone (§9 rule 17).
 */
export function AccountCard({
  account,
  selected,
  onSelectedChange,
  actions,
}: {
  account: Account
  selected: boolean
  onSelectedChange: (selected: boolean) => void
  actions: React.ReactNode
}) {
  const name = [account.firstName, account.lastName].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onSelectedChange(value === true)}
          aria-label={`Select ${account.email}`}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body text-text">{account.email}</div>
          {name && <div className="truncate text-caption text-faint">{name}</div>}
        </div>
        <div className="shrink-0">{actions}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ClubBadge club={account.club} />
        <StatusChip status={account.status} kind="account" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <MembershipCell account={account} />
        {account.lastCheckedAt && (
          <span className="text-caption text-faint">
            checked <RelativeTime value={account.lastCheckedAt} />
          </span>
        )}
      </div>
    </div>
  )
}
