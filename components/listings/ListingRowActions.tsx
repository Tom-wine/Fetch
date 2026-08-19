'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCopy,
  ExternalLink,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Hint } from '@/components/ui/tooltip'
import type { ActionTone } from '@/components/domain/ActionsMenu'
import type { Listing } from '@/lib/types'

/**
 * The §8.6 `⋮` column. Same grammar as the toolbar-level <ActionsMenu> — icon, label,
 * a muted sentence of explanation, destructive items below a separated danger zone
 * (§9 rule 11) — but triggered by the glyph the column spec asks for, because it
 * lives in a 44px table cell.
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

export function ListingRowActions({
  listing,
  onActivate,
  onDeactivate,
  onDelete,
  className,
}: {
  listing: Listing
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
  className?: string
}) {
  const router = useRouter()

  const items: RowAction[] = [
    {
      id: 'fixture',
      icon: ExternalLink,
      label: 'Open fixture',
      description: 'Shows every ticket behind this listing.',
      tone: 'primary',
      onSelect: () => router.push(`/mytickets/fixture/${listing.fixtureId}`),
    },
    {
      id: 'copy',
      icon: ClipboardCopy,
      label: 'Copy listing ID',
      description: 'The marketplace-side reference, for a support ticket.',
      onSelect: () => void copyListingId(listing),
    },
    {
      id: 'activate',
      icon: PlayCircle,
      label: 'Activate',
      description: 'Publishes the listing so buyers can see it.',
      tone: 'success',
      // SOLDOUT has nothing left to publish, and an already-live listing is a no-op.
      disabled: listing.status === 'ACTIVE' || listing.status === 'SOLDOUT',
      onSelect: onActivate,
    },
    {
      id: 'deactivate',
      icon: PauseCircle,
      label: 'Deactivate',
      description: 'Takes the listing down without deleting it.',
      tone: 'warning',
      disabled: listing.status === 'INACTIVE' || listing.status === 'SOLDOUT',
      onSelect: onDeactivate,
    },
  ]

  const dangerItems: RowAction[] = [
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Removes the listing from the marketplace and from Fetch.io.',
      tone: 'danger',
      onSelect: onDelete,
    },
  ]

  return (
    <DropdownMenu>
      <Hint label="Listing actions">
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          aria-label={`Actions for listing ${listing.listingId}`}
          className={cn(
            'flex size-8 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text data-[state=open]:bg-surface-hover data-[state=open]:text-text',
            className,
          )}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
      </Hint>

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

async function copyListingId(listing: Listing) {
  try {
    await navigator.clipboard.writeText(listing.listingId)
    toast.success('Listing ID copied.')
  } catch {
    toast.error('Could not copy the listing ID.')
  }
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
