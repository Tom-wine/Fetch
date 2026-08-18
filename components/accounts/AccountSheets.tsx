'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileUp, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Prose, SectionLabel } from '@/components/ui/typography'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

/**
 * Shells only — Part 5 builds the manual form and the four-step CSV wizard (§8.3)
 * and mounts them here.
 *
 * They open as a right-hand Sheet because `components/ui/` has `alert-dialog` and
 * `sheet` but no plain centred Dialog, and `components/ui/**` is shared with the
 * parallel session this week (see the ASK in fetch-sync.md). Swapping to a centred
 * modal later is a two-line change in this file.
 *
 * The copy says what is missing rather than pretending — §9 rule 5, no placeholder
 * strings shipped.
 */

function ShellBody({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof UserPlus
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <span className="flex size-12 items-center justify-center rounded-md bg-fetch-gradient">
        <Icon className="size-5 text-white" aria-hidden="true" />
      </span>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  )
}

export function AddAccountSheet({
  open,
  onOpenChange,
  /** Set when the sheet was opened from a row's Edit action. */
  editingEmail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingEmail?: string | null
}) {
  const editing = Boolean(editingEmail)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-border bg-surface sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-mono text-title uppercase">
            {editing ? 'Edit account' : 'Add account'}
          </SheetTitle>
          <SheetDescription asChild>
            <Prose className="text-muted">
              {editing
                ? `Editing ${editingEmail}.`
                : 'One account, entered by hand. For a club spreadsheet, use Import instead.'}
            </Prose>
          </SheetDescription>
        </SheetHeader>

        <ShellBody icon={UserPlus} label="lands_in_part_5">
          <Prose className="text-muted">
            The keyboard-first form goes here: club, email, password, membership type, client
            reference, name, phone, loyalty points, proxy, tags and notes — with a live duplicate
            check on the email field and a “Save &amp; add another” footer that keeps the club and
            clears the identity fields.
          </Prose>
          <div className="flex flex-wrap gap-2">
            <SheetClose asChild>
              <Button variant="secondary" label="Close" />
            </SheetClose>
          </div>
        </ShellBody>
      </SheetContent>
    </Sheet>
  )
}

export function ImportSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-border bg-surface sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-mono text-title uppercase">Import accounts</SheetTitle>
          <SheetDescription asChild>
            <Prose className="text-muted">A CSV of club accounts, up to 5000 rows.</Prose>
          </SheetDescription>
        </SheetHeader>

        <ShellBody icon={FileUp} label="lands_in_part_5">
          <Prose className="text-muted">
            The four-step wizard goes here: upload with a downloadable template, column mapping with
            fuzzy auto-match, per-row validation you can fix inline, then the commit with a summary
            and an error report. Parsing runs in a web worker so 5000 rows never freeze the page.
          </Prose>
          <div className="flex flex-wrap gap-2">
            {/* One <a>, not a button wrapping a link, so it is middle-clickable and
                keyboard-navigable like any other link. `label` supplies the caption,
                so the slotted element carries only the icon. */}
            <Button asChild variant="secondary" label="Open full page">
              <Link href="/accounts/import">
                <FileUp className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <SheetClose asChild>
              <Button variant="ghost" label="Close" />
            </SheetClose>
          </div>
        </ShellBody>
      </SheetContent>
    </Sheet>
  )
}
