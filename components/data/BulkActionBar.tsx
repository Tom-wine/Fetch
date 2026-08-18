'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Appears on selection (§8.2). The selection-driven action surface is one of the
 * things the source app got right (§9 Keep), and every label carries its count so
 * the operator never has to remember what is selected.
 */
export function BulkActionBar({
  count,
  /** Singular noun; pluralised here. */
  noun,
  onClear,
  /**
   * Set when the table is server-paged. The header checkbox can only reach the rows
   * currently loaded, so the bar says "12 accounts selected on this page" rather
   * than implying a cross-page selection the API cannot honour.
   */
  pageScoped = false,
  children,
  className,
}: {
  count: number
  noun: string
  onClear: () => void
  pageScoped?: boolean
  children: React.ReactNode
  className?: string
}) {
  if (count === 0) return null

  const summary = `${count} ${count === 1 ? noun : `${noun}s`} selected${
    pageScoped ? ' on this page' : ''
  }`

  return (
    <div
      role="region"
      aria-label={summary}
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-primary/8 px-4 py-2.5',
        className,
      )}
    >
      <span className="text-body font-semibold text-primary-ink tabular-nums">{summary}</span>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {children}
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
