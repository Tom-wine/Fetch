'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Banknote, Store, Tag, Terminal, UserRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/data/states'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Prose } from '@/components/ui/typography'
import { Chip } from '@/components/domain/StatusChip'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { useActivity } from '@/lib/api/hooks/useDashboard'
import type { ActivityKind } from '@/lib/types'
import { Panel } from './Panel'

/**
 * Row 2 right of §8.1 — the activity feed, one tab per source.
 *
 * The tab labels are brand names, so they render verbatim rather than in the
 * UPPER_SNAKE chrome grammar (§3.3b guardrail: never snake domain data).
 *
 * `GET /activity` sorts ascending by default, which on a feed would put the oldest
 * entry at the top and hang the "Last update" chip on it. The sort is therefore
 * stated explicitly rather than left to the endpoint's default.
 */

const SOURCES = [
  { id: 'fetch', label: 'Fetch News' },
  { id: 'viagogo', label: 'Viagogo' },
  { id: 'ticombo', label: 'Ticombo' },
  { id: 'stubhub', label: 'StubHub' },
  { id: 'gigsberg', label: 'GigsBerg' },
] as const

type SourceId = (typeof SOURCES)[number]['id']

/** The icon says what KIND of thing happened; the tab already says where. */
const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  sale: Banknote,
  listing: Tag,
  account: UserRound,
  system: Terminal,
  marketplace: Store,
}

const PAGE_SIZE = 4

export function ActivityCard({ className }: { className?: string }) {
  const [source, setSource] = React.useState<SourceId>('fetch')

  const query = useActivity({ source: [source], sort: 'at', order: 'desc', pageSize: PAGE_SIZE })
  const entries = query.data?.data ?? []
  const label = SOURCES.find((option) => option.id === source)?.label ?? source

  return (
    <Panel title="Activity" label="what happened while you were away" className={className}>
      <Tabs value={source} onValueChange={(value) => setSource(value as SourceId)}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-md bg-surface-raised p-1">
          {SOURCES.map((option) => (
            <TabsTrigger
              key={option.id}
              value={option.id}
              className="rounded-sm px-2.5 py-1.5 font-mono text-body font-medium text-muted data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {query.error ? (
          <ErrorState
            message={query.error.message}
            onRetry={() => void query.refetch()}
            className="min-h-[200px]"
          />
        ) : query.isPending ? (
          <ul className="divide-y divide-border">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-3 py-3">
                <Skeleton className="size-8 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <Prose className="py-8 text-center text-muted">
            Nothing from {label} yet. Sales, price changes and delivery problems from this
            marketplace will appear here.
          </Prose>
        ) : (
          <ul
            className={cn(
              'divide-y divide-border transition-opacity',
              // A tab switch keeps the previous list on screen (placeholderData) —
              // dimming it says "this is the old tab" without a layout jump.
              query.isFetching && 'opacity-60',
            )}
          >
            {entries.map((entry, index) => {
              const Icon = KIND_ICON[entry.kind]
              const newest = index === 0

              return (
                <li
                  key={entry.id}
                  className={cn(
                    'flex gap-3 py-3',
                    newest && 'border-l-2 border-primary pl-3',
                    index === 0 && 'pt-0',
                  )}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-muted">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-semibold text-text">{entry.title}</span>
                      {newest && <Chip tone="primary">Last update</Chip>}
                    </div>
                    <Prose className="mt-1 line-clamp-2 text-muted">{entry.body}</Prose>
                    <RelativeTime value={entry.at} className="mt-1.5 block text-caption" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Panel>
  )
}
