import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, RotateCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Display, Prose } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { GlyphMark } from '@/components/shell/GlyphMark'

/**
 * Every list in Fetch.io has four designed states: loading, empty, error, populated
 * (§11). These are the first three.
 */

/**
 * §7 #23 — icon + title + one line + a primary CTA. The title is Outfit Black caps
 * per §3.3b (`NO_ACCOUNTS_YET`); the body is Prose, because an explanation that
 * runs past two lines is unreadable in mono.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  secondaryAction,
  /** Empty regions are the only place a decorative glyph is allowed (guardrail 4). */
  glyph = 'brackets',
  className,
}: {
  icon: LucideIcon
  /** Chrome string — UPPER_SNAKE'd here. */
  title: string
  body: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  glyph?: 'code' | 'braces' | 'brackets' | 'prompt' | 'none'
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden px-6 py-12 text-center',
        className,
      )}
    >
      {glyph !== 'none' && (
        <GlyphMark glyph={glyph} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      )}
      <div className="relative flex max-w-md flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-md bg-fetch-gradient">
          <Icon className="size-5 text-white" aria-hidden="true" />
        </span>
        <Display as="h2" size="h2" className="text-text">
          {upperSnake(title)}
        </Display>
        <Prose className="text-muted">{body}</Prose>
        {(action || secondaryAction) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * §7 #24 — what failed, and a Retry. The message is a plain sentence, never
 * `// snake_case` (guardrail 2): style must not cost clarity when something broke.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-md border border-danger/30 bg-danger/12">
          <AlertTriangle className="size-5 text-danger-ink" aria-hidden="true" />
        </span>
        <h2 className="text-title font-semibold text-text uppercase">{title}</h2>
        <Prose className="text-muted">{message}</Prose>
        {onRetry && (
          <Button variant="secondary" label="Retry" onClick={onRetry} className="mt-2">
            <RotateCw className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * §7 #25 — skeleton-load every table, never a spinner. A spinner says "wait";
 * a skeleton says "here is the shape of what is coming".
 */
export function SkeletonTable({
  rows = 8,
  columns = 6,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('w-full', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading rows</span>
      <div className="flex items-center gap-4 border-b border-border bg-surface-raised px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3 flex-1"
              // Varying the widths stops the block reading as a loading bar.
              style={{ maxWidth: c === 0 ? '100%' : `${60 + ((r * 7 + c * 13) % 35)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      className={cn('space-y-3 rounded-lg border border-border bg-surface p-6', className)}
      aria-busy="true"
    >
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-7 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  )
}
