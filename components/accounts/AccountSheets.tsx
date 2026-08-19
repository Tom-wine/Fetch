'use client'

import * as React from 'react'

import { Prose } from '@/components/ui/typography'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ManualEntryForm } from '@/components/import/ManualEntryForm'
import type { Account } from '@/lib/types'

/**
 * `Add account` / `Edit account` — the §8.3 manual-entry form in a right-hand Sheet.
 *
 * The form itself lives in `components/import/` because it is Tab A of the import
 * wizard: the same component, the same validation and the same live duplicate check
 * whether it is reached from the toolbar's ADD_ACCOUNT or from the Manual entry tab
 * inside IMPORT. Two forms that collect the same eleven fields would drift, and the
 * one that drifts is always the one the operator is using.
 *
 * A Sheet rather than a centred modal: one column of fields does not need 1180px, and
 * a panel that slides in beside the table leaves the row the operator was looking at
 * on screen. The CSV wizard is the one that earns a modal (see
 * components/import/ImportDialog.tsx).
 */
export function AddAccountSheet({
  open,
  onOpenChange,
  /** Set when the sheet was opened from a row's Edit action. */
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
}) {
  const editing = Boolean(account)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 border-border bg-surface p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-mono text-title uppercase">
            {editing ? 'Edit account' : 'Add account'}
          </SheetTitle>
          <SheetDescription asChild>
            <Prose className="text-muted">
              {editing
                ? `Editing ${account!.email}. Leave the password empty to keep the stored one.`
                : 'One account, entered by hand. For a club spreadsheet, use Import instead.'}
            </Prose>
          </SheetDescription>
        </SheetHeader>

        {/* Remounted per account so the form's defaults are re-read rather than
            reset in an effect — the operator can open Edit on two rows in a row and
            the second one is not showing the first one's values. */}
        <ManualEntryForm
          key={account?.id ?? 'new'}
          account={account}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
