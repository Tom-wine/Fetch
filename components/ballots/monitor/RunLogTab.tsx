'use client'

import * as React from 'react'
import { ArrowDown, ScrollText } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState } from '@/components/data/states'
import { upperSnake } from '@/lib/format/text'
import type { EventLevel, RunEvent } from '@/lib/types'

import { EVENT_LEVELS, EventRow } from './event-row'
import type { EventFeed } from '@/lib/api/hooks/useRunMonitor'

/**
 * `RUN_LOG` — the live tail (§B5.5).
 *
 * THE AUTO-SCROLL RULE. The log follows the newest line only while the reader is
 * already at the bottom. The moment they scroll up, following stops — no exception, no
 * timeout that quietly re-arms it — and new lines pile up behind a
 * `JUMP_TO_LATEST (14 new)` button instead. Nothing is more hostile than a log that
 * yanks the line you are reading off the screen while you read it, and on this screen
 * that happens once a second.
 *
 * Following resumes on its own when the reader scrolls back to the bottom, because
 * that gesture means exactly "show me the newest" and making them press a button for
 * it would be the same rule applied stupidly.
 *
 * The feed itself never deduplicates (§B7 rule 5) — see useRunMonitor.
 */

/** How close to the bottom still counts as "at the bottom". One row of slack. */
const STICK_THRESHOLD_PX = 48

export function RunLogTab({
  feed,
  level,
  onLevelChange,
}: {
  feed: EventFeed
  level: EventLevel | 'all'
  onLevelChange: (level: EventLevel | 'all') => void
}) {
  const [search, setSearch] = React.useState('')
  const searchId = React.useId()

  const visible = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    return feed.events.filter((event) => {
      if (level !== 'all' && event.level !== level) return false
      if (!needle) return true
      return (
        event.message.toLowerCase().includes(needle) || event.code.toLowerCase().includes(needle)
      )
    })
  }, [feed.events, level, search])

  const scroller = React.useRef<HTMLDivElement>(null)
  const [following, setFollowing] = React.useState(true)
  const [unread, setUnread] = React.useState(0)

  const followingRef = React.useRef(following)
  followingRef.current = following

  const seenCount = React.useRef(visible.length)

  const scrollToBottom = React.useCallback(() => {
    const node = scroller.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [])

  /**
   * Runs after every render that changed the list. Following means "pin to the
   * bottom"; not following means "count what arrived and leave the scroll alone".
   */
  React.useLayoutEffect(() => {
    if (visible.length === seenCount.current) return

    if (followingRef.current) {
      scrollToBottom()
      setUnread(0)
    } else if (visible.length > seenCount.current) {
      setUnread((n) => n + (visible.length - seenCount.current))
    } else {
      // The list shrank — a filter changed, not new events. The old count is
      // meaningless now.
      setUnread(0)
    }

    seenCount.current = visible.length
  }, [visible.length, scrollToBottom])

  // Changing the filter re-anchors to the bottom, because the reader just asked a
  // fresh question and the answer's newest line is the one they want.
  React.useEffect(() => {
    setFollowing(true)
    setUnread(0)
    // The list has to be rendered before it can be scrolled.
    const frame = requestAnimationFrame(scrollToBottom)
    return () => cancelAnimationFrame(frame)
  }, [level, search, scrollToBottom])

  const onScroll = React.useCallback(() => {
    const node = scroller.current
    if (!node) return
    const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= STICK_THRESHOLD_PX
    setFollowing(atBottom)
    if (atBottom) setUnread(0)
  }, [])

  const jump = React.useCallback(() => {
    setFollowing(true)
    setUnread(0)
    scrollToBottom()
  }, [scrollToBottom])

  if (feed.error) {
    return <ErrorState title="The log stopped" message={feed.error} onRetry={feed.onRetry} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <label htmlFor={searchId} className="sr-only">
          Search the log
        </label>
        <Input
          id={searchId}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the log"
          className="h-8 min-w-[140px] flex-1 border-border bg-surface-raised text-body"
        />

        <div className="flex items-center gap-1" role="group" aria-label="Filter by level">
          <LevelButton label="All" active={level === 'all'} onSelect={() => onLevelChange('all')} />
          {EVENT_LEVELS.map((entry) => (
            <LevelButton
              key={entry}
              label={entry}
              active={level === entry}
              onSelect={() => onLevelChange(level === entry ? 'all' : entry)}
            />
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={onScroll}
          role="log"
          // `polite`, not `assertive`: a screen reader must not interrupt on every
          // line of a log that emits one a second.
          aria-live="polite"
          aria-label="Run log"
          tabIndex={0}
          className="h-full overflow-y-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {visible.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={feed.events.length === 0 ? 'Nothing logged yet' : 'Nothing matches'}
              body={
                feed.events.length === 0
                  ? 'Events appear here as the run works through its accounts.'
                  : 'No line in this log matches that level or that text.'
              }
              glyph="none"
              className="min-h-[200px]"
            />
          ) : (
            <ul>
              {visible.map((event) => (
                <EventRow key={eventKey(event)} event={event} />
              ))}
            </ul>
          )}
        </div>

        {unread > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              size="sm"
              label="Jump to latest"
              count={unread}
              onClick={jump}
              className="pointer-events-auto shadow-lg"
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-1.5 font-mono text-caption text-faint tabular-nums">
        {`// ${visible.length} of ${feed.events.length} ${feed.events.length === 1 ? 'event' : 'events'}`}
        {!following && ' · following paused'}
      </div>
    </div>
  )
}

/**
 * `seq` alone would do, but a key that includes the id survives the one case it does
 * not: two runs' feeds briefly coexisting in the same list during a route change.
 */
function eventKey(event: RunEvent): string {
  return `${event.runId}:${event.seq}`
}

function LevelButton({
  label,
  active,
  onSelect,
}: {
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'rounded-sm border px-1.5 py-1 font-mono text-label transition-colors duration-150',
        active
          ? 'border-primary/40 bg-primary/10 text-primary-ink'
          : 'border-transparent text-faint hover:bg-surface-hover hover:text-text',
      )}
    >
      {upperSnake(label)}
    </button>
  )
}
