'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCopy,
  LogIn,
  MoreVertical,
  Pencil,
  RefreshCw,
  Signal,
  Ticket,
  Trash2,
  KeyRound,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Prose } from '@/components/ui/typography'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ActionTone } from '@/components/domain/ActionsMenu'
import type { Account } from '@/lib/types'

/**
 * The §8.2 row menu. Same grammar as the toolbar-level <ActionsMenu> — icon, label,
 * a muted sentence of explanation, destructive items below a separated danger zone
 * (§9 rule 11) — but triggered by the `⋮` the column spec asks for rather than a
 * full-width labelled button, because it lives in a 44px table cell.
 */

const TONE: Record<ActionTone, string> = {
  default: 'text-text',
  primary: 'text-primary-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  violet: 'text-violet-ink',
  danger: 'text-danger-ink',
}

interface RowAction {
  id: string
  icon: LucideIcon
  label: string
  description: string
  tone?: ActionTone
  disabled?: boolean
  onSelect: () => void
}

export interface AccountRowActionsProps {
  account: Account
  onAction: (action: 'login' | 'relogin' | 'reset-password') => void
  onTestProxy: () => void
  onEdit: () => void
  onCopyCredentials: () => void
  onDelete: () => void
  className?: string
}

export function AccountRowActions({
  account,
  onAction,
  onTestProxy,
  onEdit,
  onCopyCredentials,
  onDelete,
  className,
}: AccountRowActionsProps) {
  const router = useRouter()

  const items: RowAction[] = [
    {
      id: 'login',
      icon: LogIn,
      label: 'Login',
      description: 'Sign in now and refresh the session.',
      onSelect: () => onAction('login'),
    },
    {
      id: 'relogin',
      icon: RefreshCw,
      label: 'Relogin',
      description: 'Force a fresh sign-in when the session looks stale.',
      tone: 'warning',
      onSelect: () => onAction('relogin'),
    },
    {
      id: 'reset-password',
      icon: KeyRound,
      label: 'Reset password',
      description: 'The club emails a new one. The stored password stops working.',
      tone: 'warning',
      onSelect: () => onAction('reset-password'),
    },
    {
      id: 'test-proxy',
      icon: Signal,
      label: 'Test proxy',
      description: account.proxyId
        ? 'Check the assigned proxy still responds.'
        : 'This account has no proxy assigned.',
      disabled: !account.proxyId,
      onSelect: onTestProxy,
    },
    {
      id: 'edit',
      icon: Pencil,
      label: 'Edit',
      description: 'Change club, membership or identity details.',
      onSelect: onEdit,
    },
    {
      id: 'copy',
      icon: ClipboardCopy,
      label: 'Copy credentials',
      description: 'Copies email and password to the clipboard without showing them.',
      onSelect: onCopyCredentials,
    },
    {
      id: 'tickets',
      icon: Ticket,
      label: 'View tickets',
      description: 'Every ticket this account has bought.',
      onSelect: () => router.push(`/mytickets?account=${encodeURIComponent(account.id)}`),
    },
  ]

  const dangerItems: RowAction[] = [
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Removes the account and its stored credentials.',
      tone: 'danger',
      onSelect: onDelete,
    },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // The row itself is clickable, so the menu must not open it as well.
        onClick={(e) => e.stopPropagation()}
        aria-label={`Actions for ${account.email}`}
        className={cn(
          'flex size-8 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text data-[state=open]:bg-surface-hover data-[state=open]:text-text',
          className,
        )}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="w-[300px] border-border bg-surface"
      >
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-mono text-label text-danger-ink">
          {'// danger_zone'}
        </DropdownMenuLabel>
        {dangerItems.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Item({ item }: { item: RowAction }) {
  const Icon = item.icon
  const tone = TONE[item.tone ?? 'default']

  return (
    <DropdownMenuItem
      disabled={item.disabled}
      onSelect={item.onSelect}
      className="items-start gap-2.5 py-2"
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body font-medium', tone)}>{upperSnake(item.label)}</span>
        <Prose className="mt-0.5 block text-[12px] leading-snug text-muted">
          {item.description}
        </Prose>
      </span>
    </DropdownMenuItem>
  )
}
