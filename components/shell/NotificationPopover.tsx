'use client'

import * as React from 'react'
import { AlertTriangle, Bell, CheckCircle2, Store } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Hint } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Kind = 'success' | 'issue' | 'marketplace'

interface Notification {
  id: string
  kind: Kind
  title: string
  body: string
  at: string
  unread: boolean
}

/** Static until /notifications lands in Part 3. */
const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    kind: 'success',
    title: 'Listing sold',
    body: 'Arsenal v Chelsea — North Bank Upper 21, Row 14, 2 seats sold on StubHub.',
    at: '4m ago',
    unread: true,
  },
  {
    id: 'n2',
    kind: 'issue',
    title: 'Account needs OTP',
    body: 'k.dubois@mail.com hit a 2FA challenge on Man City and is waiting on a code.',
    at: '1h ago',
    unread: true,
  },
  {
    id: 'n3',
    kind: 'marketplace',
    title: 'Viagogo price drop',
    body: 'Three comparable listings undercut yours for Liverpool v Everton.',
    at: 'yesterday',
    unread: false,
  },
]

const ICONS: Record<Kind, typeof Bell> = {
  success: CheckCircle2,
  issue: AlertTriangle,
  marketplace: Store,
}

const TONE: Record<Kind, string> = {
  success: 'text-success-ink',
  issue: 'text-warning-ink',
  marketplace: 'text-primary-ink',
}

const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'unread', label: 'Unread', match: (n: Notification) => n.unread },
  { key: 'success', label: 'Success', match: (n: Notification) => n.kind === 'success' },
  { key: 'issues', label: 'Issues', match: (n: Notification) => n.kind === 'issue' },
  {
    key: 'marketplace',
    label: 'Marketplace',
    match: (n: Notification) => n.kind === 'marketplace',
  },
] as const

export function NotificationPopover() {
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <Popover>
      <Hint
        label={unreadCount === 0 ? 'Notifications' : `Notifications — ${unreadCount} unread`}
        side="bottom"
      >
        <PopoverTrigger
          aria-label={`Notifications, ${unreadCount} unread`}
          className="relative flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text"
        >
          <Bell className="size-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary ring-2 ring-bg"
            />
          )}
        </PopoverTrigger>
      </Hint>

      <PopoverContent align="end" className="w-[380px] border-border bg-surface p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="min-w-0">
            <div className="text-title font-semibold text-text uppercase">Notifications</div>
            <SectionLabel className="mt-1">
              {unreadCount === 0 ? 'you are all caught up' : `${unreadCount} unread`}
            </SectionLabel>
          </div>
          <button type="button" className="shrink-0 text-caption text-primary-ink hover:underline">
            Mark all read
          </button>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="m-3 flex h-auto w-[calc(100%-1.5rem)] flex-wrap justify-start gap-1 bg-surface-raised p-1">
            {TABS.map((tab) => {
              const count = NOTIFICATIONS.filter(tab.match).length
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-sm px-2 py-1 text-chip font-medium text-muted data-[state=active]:bg-primary/15 data-[state=active]:text-primary-ink"
                >
                  {tab.label}
                  <span className="ml-1 text-faint">{count}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {TABS.map((tab) => {
            const items = NOTIFICATIONS.filter(tab.match)
            return (
              <TabsContent key={tab.key} value={tab.key} className="mt-0 max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Bell className="mx-auto mb-3 size-6 text-faint" aria-hidden="true" />
                    <Prose className="text-muted">Nothing here yet.</Prose>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((n) => {
                      const Icon = ICONS[n.kind]
                      return (
                        <li
                          key={n.id}
                          className={cn(
                            'flex gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-hover',
                            n.unread && 'bg-primary/5',
                          )}
                        >
                          <Icon
                            className={cn('mt-0.5 size-4 shrink-0', TONE[n.kind])}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-body font-medium text-text">{n.title}</div>
                            <Prose className="line-clamp-2 text-muted">{n.body}</Prose>
                            <div className="mt-1 text-caption text-faint">{n.at}</div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
