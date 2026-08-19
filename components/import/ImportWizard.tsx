'use client'

import * as React from 'react'
import { FileSpreadsheet, UserPlus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { snake } from '@/lib/format/text'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import type { Account } from '@/lib/types'
import { BulkImportTab } from './BulkImportTab'
import { ImportDialog } from './ImportDialog'
import { ManualEntryForm } from './ManualEntryForm'

/**
 * §8.3's account import: `Manual entry` and `Bulk CSV import`, in one component that
 * renders identically at `/accounts/import` and inside the modal the /accounts
 * toolbar opens. One component, two mounts — a wizard that behaves differently
 * depending on how it was opened is two features to maintain and two to get wrong.
 *
 * The tabs are the same underline rail /accounts uses for its own level-1 tabs, so
 * the two screens read as one product.
 */

export type ImportTab = 'manual' | 'bulk'

export function ImportWizard({
  defaultTab = 'bulk',
  /** Set to edit an existing account rather than create one — manual tab only. */
  account,
  onBusyChange,
  onDone,
  className,
}: {
  defaultTab?: ImportTab
  account?: Account | null
  onBusyChange?: (busy: boolean) => void
  onDone?: () => void
  className?: string
}) {
  const [tab, setTab] = React.useState<ImportTab>(account ? 'manual' : defaultTab)

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as ImportTab)}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-6 py-0 text-muted">
        {(
          [
            { id: 'manual', label: 'Manual entry', icon: UserPlus },
            { id: 'bulk', label: 'Bulk CSV import', icon: FileSpreadsheet },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 font-mono text-nav whitespace-nowrap text-muted shadow-none transition-colors duration-150 hover:text-text data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-text data-[state=active]:shadow-none"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {snake(label)}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Both panels stay mounted: switching to Manual entry to check a club name
          must not throw away a mapped 500-row file. `forceMount` keeps the CSV
          state alive; `hidden` keeps it out of the accessibility tree. */}
      <TabsContent
        value="manual"
        forceMount
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <ManualEntryForm account={account} onDone={onDone} />
      </TabsContent>

      <TabsContent
        value="bulk"
        forceMount
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <BulkImportTab onBusyChange={onBusyChange} onClose={onDone} />
      </TabsContent>
    </Tabs>
  )
}

/**
 * The modal mount, opened by the /accounts toolbar's IMPORT button.
 *
 * §8.3: "If the user closes the wizard mid-import, warn first." That is two guards,
 * not one — the dialog's own close paths (X, Escape, the overlay) go through
 * `onRequestClose`, and a browser tab close or reload goes through `beforeunload`.
 * Missing either one loses the operator's work exactly as completely.
 */
export function ImportWizardModal({
  open,
  onOpenChange,
  defaultTab = 'bulk',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: ImportTab
}) {
  const [busy, setBusy] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)

  React.useEffect(() => {
    if (!busy || !open) return

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      // Browsers show their own wording; a non-empty returnValue is what arms it.
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy, open])

  // A wizard that was closed has no work to protect on the next open.
  React.useEffect(() => {
    if (!open) setBusy(false)
  }, [open])

  return (
    <>
      <ImportDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Import accounts"
        description="Add one account by hand, or bring in a whole club export as CSV."
        onRequestClose={() => {
          if (!busy) return true
          setConfirming(true)
          return false
        }}
      >
        <ImportWizard
          defaultTab={defaultTab}
          onBusyChange={setBusy}
          onDone={() => onOpenChange(false)}
        />
      </ImportDialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        verb="Discard"
        count={1}
        noun="import"
        title="Close this import?"
        description="The file you uploaded, the columns you mapped and every fix you made are lost. Any accounts already written stay written."
        confirmLabel="Discard it"
        onConfirm={() => {
          setConfirming(false)
          setBusy(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
