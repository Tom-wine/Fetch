'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { FileDown, Globe, Layers, Pencil, Send, Share2, Trash2, Wallet } from 'lucide-react'

import { useLocale } from '@/lib/format/LocaleProvider'
import { ActionsMenu, type ActionItem } from '@/components/domain/ActionsMenu'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { useDeleteTickets, useTicketAction } from '@/lib/api/hooks/useFixtures'
import { useSetTicketVisibility, useUpdateTickets } from '@/lib/api/hooks/useFixtureDetail'
import type { Account, Fixture, Ticket } from '@/lib/types'
import { EditTicketsDialog } from './EditTicketsDialog'
import { buildSeatSheet, downloadBlob, seatSheetFilename } from './seat-sheet'

/**
 * The §8.5 Actions menu, reproduced item for item.
 *
 * Every item is live — optimistic update, toast, and a rollback if the write is
 * refused — with one exception. `Download wallet pass` is disabled and is not waiting
 * for a route: a .pkpass is a signed bundle and a Google Wallet pass a signed JWT, and
 * both need a private key that must never reach a browser. It keeps §8.5's label and
 * description and carries a tooltip saying what it needs, because an item that says
 * why it cannot act is an honest empty hand and a renamed one teaches the wrong name.
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
  const visibility = useSetTicketVisibility()
  const update = useUpdateTickets()

  const [editOpen, setEditOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const busy = action.isPending || remove.isPending || visibility.isPending || update.isPending

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
      id: 'edit',
      icon: Pencil,
      label: 'Edit',
      description: 'Edit ticket details',
      disabled: busy,
      onSelect: () => defer(() => setEditOpen(true)),
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
      tooltip:
        'Needs a signing backend. A .pkpass is a signed bundle and a Google Wallet pass is a signed JWT — the key that signs them cannot live in a browser.',
    },
    {
      id: 'public',
      icon: Globe,
      label: 'Public',
      description: 'Make ticket public',
      tone: 'primary',
      disabled: busy,
      // `Public` states an outcome, so it PATCHes visibility directly rather than
      // going through `share`, which reveals a seat as a side effect of publishing a
      // QR link. Same field, different intent, different toast.
      onSelect: () => visibility.setVisibility(ids, 'visible'),
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

      <EditTicketsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tickets={tickets}
        busy={update.isPending}
        onConfirm={(patch) => {
          setEditOpen(false)
          update.mutate({ ids, patch })
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        verb="Delete"
        count={count}
        noun="ticket"
        description="The seats are removed from Fetch.io. This cannot be undone."
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
