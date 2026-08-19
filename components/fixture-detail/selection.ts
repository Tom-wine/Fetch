'use client'

import * as React from 'react'

import type { RowSelectionState } from '@/components/data/DataTable'
import type { Ticket } from '@/lib/types'

/**
 * The seat table's selection model (§8.5 keyboard rules).
 *
 * DataTable already gives rows arrow-key movement, space to toggle and enter to open.
 * The two behaviours it cannot give — because they need to know what the ROWS mean —
 * live here:
 *
 *   shift+click   selects the range between the anchor and the row clicked, which is
 *                 how anyone selects "these six seats" without six clicks.
 *   escape        clears the selection, so there is always a way back to nothing
 *                 selected that does not involve finding every checkbox again.
 *
 * Modifier keys are read through a capture-phase pointer listener on the table's own
 * container rather than from the click handler, because `DataTable`'s `onRowClick`
 * and `onSelectionChange` hand back a row and a selection — not the event that caused
 * them. Capture runs before either fires, so the flags are already correct.
 *
 * `Auto Group` folds in here too: with it on, any seat that joins the selection brings
 * the rest of its group, because a group is a lot that was bought to be sold together
 * and acting on half of one is nearly always a mistake.
 */
export interface SeatSelection {
  selection: RowSelectionState
  /** Handed straight to DataTable. */
  onSelectionChange: (next: RowSelectionState) => void
  /** Handed straight to DataTable. */
  onRowClick: (ticket: Ticket) => void
  /** Spread onto the element wrapping the table. */
  containerProps: {
    onMouseDownCapture: (event: React.MouseEvent) => void
    onKeyDownCapture: (event: React.KeyboardEvent) => void
  }
  selectedIds: string[]
  selectedTickets: Ticket[]
  clear: () => void
}

export function useSeatSelection(rows: Ticket[], autoGroup: boolean): SeatSelection {
  const [selection, setSelection] = React.useState<RowSelectionState>({})

  const modifiers = React.useRef({ shift: false, toggle: false })
  const anchor = React.useRef<string | null>(null)

  // The rows the table is currently holding, by id and by index — everything below
  // resolves a range or a group against exactly what is on screen.
  const ids = React.useMemo(() => rows.map((row) => row.id), [rows])
  const indexById = React.useMemo(() => new Map(ids.map((id, i) => [id, i])), [ids])
  const byId = React.useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])

  /**
   * A selection can only mean the rows on screen. The header checkbox is page-scoped,
   * every action posts the ids it holds, and a seat that was deleted or paged away
   * must not stay in a count the operator cannot see. So the selection is pruned to
   * the loaded set whenever that set changes.
   */
  const idKey = ids.join(',')
  React.useEffect(() => {
    setSelection((current) => {
      const live: RowSelectionState = {}
      let changed = false
      for (const [id, on] of Object.entries(current)) {
        if (on && indexById.has(id)) live[id] = true
        else changed = true
      }
      return changed ? live : current
    })
    // `idKey` is the row set; `indexById` is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey])

  /** With Auto Group on, a selected seat pulls in every loaded seat in its group. */
  const expand = React.useCallback(
    (next: RowSelectionState): RowSelectionState => {
      if (!autoGroup) return next

      const groups = new Set<string>()
      for (const [id, on] of Object.entries(next)) {
        if (!on) continue
        const groupId = byId.get(id)?.groupId
        if (groupId) groups.add(groupId)
      }
      if (groups.size === 0) return next

      const out: RowSelectionState = { ...next }
      for (const row of rows) if (row.groupId && groups.has(row.groupId)) out[row.id] = true
      return out
    },
    [autoGroup, byId, rows],
  )

  const selectRange = React.useCallback(
    (from: string, to: string): RowSelectionState => {
      const a = indexById.get(from)
      const b = indexById.get(to)
      if (a === undefined || b === undefined) return { [to]: true }

      const out: RowSelectionState = {}
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        const id = ids[i]
        if (id) out[id] = true
      }
      return out
    },
    [ids, indexById],
  )

  const onSelectionChange = React.useCallback(
    (next: RowSelectionState) => {
      // Which row changed, so a shift+click on a checkbox can extend from the anchor
      // rather than toggling one box in the middle of a run.
      const changed = firstDifference(selection, next)

      if (changed && modifiers.current.shift && anchor.current && anchor.current !== changed) {
        setSelection(expand(selectRange(anchor.current, changed)))
        return
      }

      if (changed) anchor.current = changed
      setSelection(expand(next))
    },
    [expand, selectRange, selection],
  )

  const onRowClick = React.useCallback(
    (ticket: Ticket) => {
      const { shift, toggle } = modifiers.current

      if (shift && anchor.current) {
        setSelection(expand(selectRange(anchor.current, ticket.id)))
        return
      }

      anchor.current = ticket.id

      if (toggle) {
        setSelection((current) => {
          const next = { ...current }
          if (next[ticket.id]) delete next[ticket.id]
          else next[ticket.id] = true
          return expand(next)
        })
        return
      }

      // A plain click REPLACES the selection. The panel describes what is selected, so
      // a click that quietly added to a set from five minutes ago would leave the
      // operator acting on seats they cannot see.
      setSelection(expand({ [ticket.id]: true }))
    },
    [expand, selectRange],
  )

  const clear = React.useCallback(() => {
    anchor.current = null
    setSelection({})
  }, [])

  const containerProps = React.useMemo(
    () => ({
      onMouseDownCapture: (event: React.MouseEvent) => {
        modifiers.current = { shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey }

        // A shift+click is a range selection, and the browser's own meaning for it is
        // "extend the text selection" — which paints half the table blue behind the
        // rows the operator just picked. Cancelling the default on mousedown suppresses
        // that without touching the click; focus is then moved by hand, because
        // preventDefault would otherwise leave the arrow keys with nothing to move from.
        if (!event.shiftKey) return
        event.preventDefault()
        const row = (event.target as HTMLElement | null)?.closest?.('tr')
        if (row instanceof HTMLElement) row.focus()
      },
      onKeyDownCapture: (event: React.KeyboardEvent) => {
        // Space and shift+space arrive here too; the shift flag has to be current for
        // the selection change that follows.
        modifiers.current = { shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey }
      },
    }),
    [],
  )

  /**
   * Escape clears, from anywhere on the screen — the selection is the screen's
   * subject, not the table's. It stands down for a text field and for anything Radix
   * has opened, because there Escape already means "close this".
   */
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (isTypingTarget(event.target)) return
      if (hasOpenLayer()) return
      clear()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clear])

  const selectedIds = React.useMemo(() => ids.filter((id) => selection[id]), [ids, selection])

  const selectedTickets = React.useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((t): t is Ticket => Boolean(t)),
    [byId, selectedIds],
  )

  return {
    selection,
    onSelectionChange,
    onRowClick,
    containerProps,
    selectedIds,
    selectedTickets,
    clear,
  }
}

/** The one id whose state differs — what the operator just clicked. */
function firstDifference(before: RowSelectionState, after: RowSelectionState): string | null {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    if (Boolean(before[key]) !== Boolean(after[key])) return key
  }
  return null
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

/** A dialog, dropdown, popover or select is open — Escape belongs to it. */
function hasOpenLayer(): boolean {
  return Boolean(
    document.querySelector(
      '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    ),
  )
}
