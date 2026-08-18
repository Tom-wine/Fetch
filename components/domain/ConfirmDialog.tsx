'use client'

import * as React from 'react'

import { upperSnake } from '@/lib/format/text'
import { Prose } from '@/components/ui/typography'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Destructive confirmation (§7 #26, §9 rule 11). The title always names the count.
 *
 * The title and body are PLAIN SENTENCES, not terminal grammar — guardrail 2: style
 * must not cost clarity when something has gone wrong. Only the buttons stay
 * UPPER_SNAKE, because they are controls rather than explanation.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  /** Verb phrase, e.g. `Delete`. Combined with count + noun into the title. */
  verb,
  count,
  /** Singular noun, e.g. `account`. Pluralised here. */
  noun,
  /** Optional override for the whole title sentence. */
  title,
  description = 'This cannot be undone.',
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  verb: string
  count: number
  noun: string
  title?: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
  destructive?: boolean
}) {
  const plural = count === 1 ? noun : `${noun}s`
  const heading = title ?? `${verb} ${count} ${plural}?`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-xl border-border bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-title font-semibold uppercase">
            {heading}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <Prose className="text-muted">{description}</Prose>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={cn(buttonVariants({ variant: 'secondary' }), 'mt-0')}>
            CANCEL
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: destructive ? 'danger' : 'default' }))}
          >
            {confirmLabel ? upperSnake(confirmLabel) : `${upperSnake(verb)} (${count})`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
