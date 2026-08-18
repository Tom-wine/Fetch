'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Fixture } from '@/lib/types'
import { ErrorState, SkeletonCard } from '@/components/data/states'
import { FixtureCard } from './FixtureCard'

/**
 * The grid half of the `⊞` toggle (§8.4): the same fixtures as cards, with the same
 * four designed states and the same footer as the table, so switching layout never
 * changes what the screen is telling you.
 */
export function FixturesGrid({
  fixtures,
  loading,
  error,
  onRetry,
  empty,
  total,
  page,
  pageCount,
  onPageChange,
  toolbar,
  className,
}: {
  fixtures: Fixture[]
  loading: boolean
  error: string | null
  onRetry: () => void
  empty: React.ReactNode
  total: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  toolbar: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {toolbar}

      {error ? (
        <div className="rounded-lg border border-border bg-surface">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">{empty}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-caption text-muted tabular-nums">
              Total {total} {total === 1 ? 'fixture' : 'fixtures'}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-caption text-faint tabular-nums">
                {page} / {Math.max(pageCount, 1)}
              </span>
              <PageButton
                label="Previous page"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </PageButton>
              <PageButton
                label="Next page"
                disabled={page >= pageCount}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </PageButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-full border border-border text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40"
    >
      {children}
    </button>
  )
}
