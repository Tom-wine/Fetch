'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Prose } from '@/components/ui/typography'

/**
 * A centred modal, because this one is too wide to be a Sheet.
 *
 * `components/ui/` has `alert-dialog` and `sheet` but no plain Dialog, and
 * `components/ui/**` is shared with the parallel session this week — so rather than
 * adding a shared primitive mid-week (see the ASK in fetch-sync.md), the wizard
 * composes the Radix Dialog it already depends on, here, in a file it owns. Promoting
 * this to `components/ui/dialog.tsx` later is a move, not a rewrite.
 *
 * Sizing is the reason it exists at all: the step-3 preview is a fifteen-column table
 * over 500 rows. A 384px right-hand panel cannot show it, and a table that needs
 * horizontal scrolling to reach the cell you are trying to fix is not fixable.
 */

export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  /** Return false to keep the modal open — used to warn during a running import. */
  onRequestClose,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onRequestClose?: () => boolean
  children: React.ReactNode
}) {
  function handleOpenChange(next: boolean) {
    if (!next && onRequestClose && !onRequestClose()) return
    onOpenChange(next)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          // §3.4: modals take the 20px radius. The height is capped so the wizard's
          // own footer stays on screen and only the step body scrolls.
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[min(1180px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-mono text-title font-semibold text-text uppercase">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description asChild>
                <Prose className="mt-1 text-muted">{description}</Prose>
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-surface-hover hover:text-text"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
