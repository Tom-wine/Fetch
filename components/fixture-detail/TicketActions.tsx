'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  FileDown,
  Globe,
  Layers,
  Link2,
  Pencil,
  Repeat,
  Send,
  Share2,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react'

import { useLocale } from '@/lib/format/LocaleProvider'
import { ActionsMenu, type ActionItem } from '@/components/domain/ActionsMenu'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { useDeleteTickets, useTicketAction } from '@/lib/api/hooks/useFixtures'
import { useRevealTickets } from '@/lib/api/hooks/useFixtureDetail'
import type { Account, Fixture, Platform, Ticket } from '@/lib/types'
import { MarketplacePickerModal } from './MarketplacePickerModal'
import { buildSeatSheet, downloadBlob, seatSheetFilename } from './seat-sheet'

/**
 * The §8.5 Actions menu, reproduced item for item.
 *
 * Seven items are fully live — optimistic update, toast, and a rollback if the write
 * is refused. Four are rendered DISABLED because the API has nothing for them to
 * call, which is the same idiom as the `Coming soon` tiles in the marketplace picker
 * and `fanpass`'s `available: false` in the registry:
 *
 *   Associate listing   needs a route that LINKS an existing marketplace listing.
 *                       `POST /tickets/list` creates a new one and mints its own id,
 *                       so it would throw away the reference the operator typed in.
 *   Edit                needs `PATCH /tickets/:id`. There is no ticket PATCH at all.
 *   Resell at face      needs a club-exchange target. `Platform` is the four
 *                       marketplaces plus fanpass; any of them would be the wrong one.
 *   Wallet pass         needs a signature. A .pkpass is a signed bundle and a Google
 *                       Wallet pass is a signed JWT; neither can be made in a browser.
 *
 * All four are one small change each once the endpoint lands — see ASK 2 in
 * fetch-sync.md. Their labels and descriptions are §8.5's, unchanged, because a menu
 * that renames an item while it is unavailable teaches the wrong name.
 */
export function TicketActions({
  fixture,
  tickets,
  accounts,
  onCleared,
}: {
  fixture: Fixture
  /** The current selection, in the order the table holds it. */
  tickets: Ticket[]
  accounts: Map<string, Account>
  /** Called once a mutation has removed the rows the selection pointed at. */
  onCleared: () => void
}) {
  const { settings } = useLocale()
  const ids = React.useMemo(() => tickets.map((t) => t.id), [tickets])
  const count = tickets.length

  const action = useTicketAction()
  const remove = useDeleteTickets()
  const reveal = useRevealTickets()

  const [listOpen, setListOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const busy = action.isPending || remove.isPending || reveal.isPending

  const onDownloadPdf = React.useCallback(() => {
    try {
      const blob = buildSeatSheet({ fixture, tickets, accounts, settings })
      downloadBlob(seatSheetFilename({ fixture, tickets }), blob)
      toast.success(`Seat sheet downloaded for ${count} ${count === 1 ? 'ticket' : 'tickets'}.`)
    } catch {
      toast.error('The seat sheet could not be built. Nothing was downloaded.')
    }
  }, [accounts, count, fixture, settings, tickets])

  const items: ActionItem[] = [
    {
      id: 'group',
      icon: Layers,
      label: 'Group',
      description: 'Create or merge a group',
      count,
      disabled: busy,
      onSelect: () => action.mutate({ action: 'group', ids }),
    },
    {
      id: 'list',
      icon: Tag,
      label: 'List',
      description: 'Create a new listing',
      tone: 'primary',
      disabled: busy,
      onSelect: () => defer(() => setListOpen(true)),
    },
    {
      id: 'associate',
      icon: Link2,
      label: 'Associate listing',
      description: 'Link a supported listing or record one manually',
      tone: 'success',
      disabled: true,
    },
    {
      id: 'edit',
      icon: Pencil,
      label: 'Edit',
      description: 'Edit ticket details',
      disabled: true,
    },
    {
      id: 'transfer',
      icon: Send,
      label: 'Transfer',
      description: 'Transfer ticket to another user',
      tone: 'primary',
      disabled: busy,
      onSelect: () => action.mutate({ action: 'transfer', ids }),
    },
    {
      id: 'resell',
      icon: Repeat,
      label: 'Resell at face value',
      description: 'Resell at face value (club exchange)',
      tone: 'success',
      disabled: true,
    },
    {
      id: 'pdf',
      icon: FileDown,
      label: 'Download PDF',
      description: 'Download PDF tickets',
      tone: 'violet',
      onSelect: onDownloadPdf,
    },
    {
      id: 'wallet',
      icon: Wallet,
      label: 'Download wallet pass',
      description: 'Apple / Google Wallet pass',
      tone: 'violet',
      disabled: true,
    },
    {
      id: 'public',
      icon: Globe,
      label: 'Public',
      description: 'Make ticket public',
      tone: 'primary',
      disabled: busy,
      // `Public` and `Share` reach the same endpoint, because `POST /tickets/share` is
      // the only write that touches visibility. They are kept apart because the
      // operator's intent differs, and so does what they are told happened.
      onSelect: () => reveal.mutate({ ids }),
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Share',
      description: 'Share tickets with a QR code',
      tone: 'primary',
      disabled: busy,
      onSelect: () => action.mutate({ action: 'share', ids }),
    },
  ]

  const dangerItems: ActionItem[] = [
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Delete selected tickets',
      tone: 'danger',
      disabled: busy,
      onSelect: () => defer(() => setConfirmOpen(true)),
    },
  ]

  return (
    <>
      <ActionsMenu items={items} dangerItems={dangerItems} selectionCount={count} />

      <MarketplacePickerModal
        open={listOpen}
        onOpenChange={setListOpen}
        count={count}
        blockedPlatforms={fixture.blockedPlatforms}
        busy={action.isPending}
        onConfirm={(platform: Platform) => {
          setListOpen(false)
          action.mutate({ action: 'list', ids, platform })
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        verb="Delete"
        count={count}
        noun="ticket"
        description="The seats are removed from Fetch.io. Anything already listed on a marketplace stays there, and this cannot be undone."
        onConfirm={() => {
          setConfirmOpen(false)
          remove.mutate({ ids }, { onSuccess: onCleared })
        }}
      />
    </>
  )
}

/**
 * Radix closes the menu and restores focus in the same tick a `DropdownMenuItem` is
 * selected. Opening a dialog inside that tick makes the two fight over the focus
 * trap, and the dialog can close on the frame it opened. One frame later is enough.
 */
function defer(fn: () => void) {
  requestAnimationFrame(fn)
}
