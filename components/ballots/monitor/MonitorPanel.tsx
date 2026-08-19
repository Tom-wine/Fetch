'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BallotTask, EventLevel } from '@/lib/types'
import type { EventFeed } from '@/lib/api/hooks/useRunMonitor'

import { RunLogTab } from './RunLogTab'
import { SummaryTab } from './SummaryTab'
import { TaskLogTab } from './TaskLogTab'
import type { PanelTab } from './url-state'

/**
 * The right-hand panel (§B5.5). Three tabs, one card, never a modal — the operator has
 * to read the log and the table at the same time, which is the whole reason this
 * screen is two panes.
 *
 * Labels are `whitespace-nowrap` in a three-column grid rather than a shrinkable flex
 * row, the same fix the fixture panel needed: a truncated tab label is a control
 * nobody can identify.
 *
 * Every tab stays MOUNTED. `RUN_LOG` holds the reader's scroll position and whether
 * they have detached from the tail; unmounting it to look at the summary and coming
 * back to find the log yanked to the bottom is exactly the behaviour the auto-scroll
 * rule exists to prevent.
 */
const TABS: Array<{ value: PanelTab; label: string }> = [
  { value: 'task', label: 'TASK_LOG' },
  { value: 'log', label: 'RUN_LOG' },
  { value: 'summary', label: 'SUMMARY' },
]

export function MonitorPanel({
  runId,
  tab,
  onTabChange,
  selectedTask,
  feed,
  level,
  onLevelChange,
  summaryTasks,
  summaryLoading,
  summaryError,
  onSummaryRetry,
  className,
}: {
  runId: string
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
  selectedTask: BallotTask | null
  feed: EventFeed
  level: EventLevel | 'all'
  onLevelChange: (level: EventLevel | 'all') => void
  summaryTasks: BallotTask[]
  summaryLoading: boolean
  summaryError: string | null
  onSummaryRetry: () => void
  className?: string
}) {
  return (
    <section
      aria-label="Run detail"
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface',
        className,
      )}
    >
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as PanelTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-border p-2">
          <TabsList className="grid h-9 w-full grid-cols-3 gap-1 bg-surface-raised p-1">
            {TABS.map((entry) => (
              <TabsTrigger
                key={entry.value}
                value={entry.value}
                className="rounded-sm px-1.5 font-mono text-btn font-semibold whitespace-nowrap text-muted data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* `forceMount` plus `hidden` on the inactive panels: Radix unmounts by
            default, which would throw away the log's scroll position on every tab
            switch. `mt-0` overrides the primitive's spacing so the body starts at the
            divider and every tab fills the same box. */}
        <TabsContent
          value="task"
          forceMount
          className={cn('mt-0 min-h-0 flex-1 flex-col', tab === 'task' ? 'flex' : 'hidden')}
        >
          <TaskLogTab task={selectedTask} events={feed.events} />
        </TabsContent>

        <TabsContent
          value="log"
          forceMount
          className={cn('mt-0 min-h-0 flex-1 flex-col', tab === 'log' ? 'flex' : 'hidden')}
        >
          <RunLogTab feed={feed} level={level} onLevelChange={onLevelChange} />
        </TabsContent>

        <TabsContent
          value="summary"
          forceMount
          className={cn('mt-0 min-h-0 flex-1 flex-col', tab === 'summary' ? 'flex' : 'hidden')}
        >
          <SummaryTab
            runId={runId}
            tasks={summaryTasks}
            events={feed.events}
            loading={summaryLoading}
            error={summaryError}
            onRetry={onSummaryRetry}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
