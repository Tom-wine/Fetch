/* eslint-disable @next/next/no-img-element */
'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useOverflowFade } from '@/lib/use-overflow-fade'
import { getClub } from '@/lib/registries/clubs'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClubId } from '@/lib/types'

/**
 * Level 2 of /accounts (§8.2): crest + short name + count, "All 64" first, and it
 * scrolls sideways.
 *
 * The horizontal scroll is deliberate and is the one exception to §9 rule 1 (control
 * bars must wrap, never scroll). Rule 1 exists because a wrapped toolbar keeps every
 * control reachable; these tabs are a *ranked* list — the clubs an operator actually
 * works are at the front — so a strip that runs off the edge reads correctly, where
 * four wrapped rows of twenty clubs would bury the toolbar below the fold.
 *
 * Clubs with no accounts are omitted rather than shown as zero: a tab that filters to
 * nothing is a dead control.
 *
 * The scrolled edge is faded rather than cut, so the strip says it continues — see
 * `useOverflowFade`.
 */
export function ClubTabs({
  counts,
  total,
  value,
  onChange,
  loading = false,
  className,
}: {
  counts: Partial<Record<ClubId, number>>
  total: number
  value: ClubId | null
  onChange: (club: ClubId | null) => void
  loading?: boolean
  className?: string
}) {
  const fade = useOverflowFade<HTMLDivElement>()

  const ranked = React.useMemo(
    () =>
      (Object.entries(counts) as Array<[ClubId, number]>)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1] || getClub(a[0]).short.localeCompare(getClub(b[0]).short)),
    [counts],
  )

  if (loading) {
    return (
      <div className={cn('flex gap-2 overflow-hidden', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={fade.ref}
      style={fade.style}
      role="tablist"
      aria-label="Filter by club"
      // -mx/px pair so the scrolled edge bleeds to the page gutter instead of
      // clipping a crest mid-tab.
      className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}
    >
      <Tab active={value === null} count={total} onClick={() => onChange(null)}>
        All
      </Tab>

      {ranked.map(([id, count]) => {
        const club = getClub(id)
        return (
          <Tab
            key={id}
            active={value === id}
            count={count}
            onClick={() => onChange(value === id ? null : id)}
            crest={club.crest}
          >
            {club.short}
          </Tab>
        )
      })}
    </div>
  )
}

function Tab({
  active,
  count,
  crest,
  onClick,
  children,
}: {
  active: boolean
  count: number
  crest?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-body whitespace-nowrap transition-colors duration-150',
        active
          ? 'border-primary/30 bg-primary/12 text-primary-ink'
          : 'border-border bg-surface text-muted hover:bg-surface-hover hover:text-text',
      )}
    >
      {crest ? (
        <img src={crest} alt="" width={18} height={18} className="shrink-0" aria-hidden="true" />
      ) : null}
      {/* Club names are domain data — rendered verbatim, never snake_cased. */}
      <span>{children}</span>
      <span className={cn('tabular-nums', active ? 'text-primary-ink' : 'text-faint')}>
        {count}
      </span>
    </button>
  )
}
