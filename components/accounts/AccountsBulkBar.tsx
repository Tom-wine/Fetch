'use client'

import * as React from 'react'
import { Check, Download, RefreshCw, Signal, Tag, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SectionLabel } from '@/components/ui/typography'
import { BulkActionBar } from '@/components/data/BulkActionBar'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import type { Account, Proxy } from '@/lib/types'

/**
 * §8.2's bulk bar, plus the thing server paging makes mandatory.
 *
 * The header checkbox can only reach the rows the browser has, so the bar says
 * "12 accounts selected on this page" and every action below it runs on exactly
 * those twelve. To act on more, the operator has to *ask* — one explicit escalation
 * that fetches the matching rows and holds them as a real set, after which every
 * label, and the delete confirmation, names the real number.
 *
 * The rule this enforces: a bulk action never runs on a set whose size the operator
 * cannot see.
 */
export interface BulkEscalation {
  /** How many rows match the current filters in total. */
  total: number
  onSelectAllMatching: () => void
  pending: boolean
}

export function AccountsBulkBar({
  accounts,
  pageScoped,
  escalation,
  escalated,
  onSelectPageOnly,
  proxies,
  knownTags,
  onCheckStatus,
  onAssignProxy,
  onAddTag,
  onExport,
  onDelete,
  busy = false,
  onClear,
}: {
  accounts: Account[]
  pageScoped: boolean
  /** Offered only when a full page is selected and more rows match. */
  escalation: BulkEscalation | null
  escalated: boolean
  onSelectPageOnly: () => void
  proxies: Proxy[]
  knownTags: string[]
  onCheckStatus: () => void
  onAssignProxy: (proxyId: string) => void
  onAddTag: (tag: string) => void
  onExport: () => void
  onDelete: () => void
  busy?: boolean
  onClear: () => void
}) {
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const count = accounts.length

  if (count === 0) return null

  return (
    <div className="space-y-2">
      <BulkActionBar count={count} noun="account" pageScoped={pageScoped} onClear={onClear}>
        <Button
          variant="secondary"
          size="sm"
          label="Check status"
          onClick={onCheckStatus}
          disabled={busy}
        >
          <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden="true" />
        </Button>

        <AssignProxyPopover
          proxies={proxies}
          count={count}
          onAssign={onAssignProxy}
          disabled={busy}
        />

        <AddTagPopover knownTags={knownTags} count={count} onAdd={onAddTag} disabled={busy} />

        <Button variant="secondary" size="sm" label="Export" count={count} onClick={onExport}>
          <Download className="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="danger"
          size="sm"
          label="Delete"
          count={count}
          onClick={() => setConfirmingDelete(true)}
          disabled={busy}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </BulkActionBar>

      {escalation && (
        <button
          type="button"
          onClick={escalation.onSelectAllMatching}
          disabled={escalation.pending}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-body text-primary-ink transition-colors duration-150 hover:bg-primary/10 disabled:opacity-60"
        >
          {escalation.pending
            ? 'Selecting the whole set…'
            : `Select all ${escalation.total} accounts matching these filters`}
        </button>
      )}

      {escalated && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/5 px-4 py-2 text-body text-primary-ink">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          <span>All {count} accounts matching these filters are selected, across every page.</span>
          <button
            type="button"
            onClick={onSelectPageOnly}
            className="underline underline-offset-4 hover:text-text"
          >
            Select this page only
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        verb="Delete"
        count={count}
        noun="account"
        description="The accounts and their stored credentials are removed. This cannot be undone."
        onConfirm={() => {
          setConfirmingDelete(false)
          onDelete()
        }}
      />
    </div>
  )
}

function AssignProxyPopover({
  proxies,
  count,
  onAssign,
  disabled,
}: {
  proxies: Proxy[]
  count: number
  onAssign: (proxyId: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" label="Assign proxy" disabled={disabled}>
          <Signal className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] border-border bg-surface p-0">
        <div className="px-3 pt-3 pb-1.5">
          <SectionLabel>{`assign to ${count}`}</SectionLabel>
        </div>
        <div className="max-h-64 overflow-y-auto pb-2">
          {proxies.length === 0 && (
            <p className="px-3 py-2 text-caption text-muted">There are no proxies to assign.</p>
          )}
          {proxies.map((proxy) => (
            <button
              key={proxy.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onAssign(proxy.id)
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-body text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
            >
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  proxy.status === 'ok'
                    ? 'bg-success'
                    : proxy.status === 'dead'
                      ? 'bg-danger'
                      : 'bg-neutral-chip',
                )}
                aria-hidden="true"
              />
              <span className="flex-1 truncate">{proxy.label}</span>
              <span className="shrink-0 text-caption text-faint tabular-nums">
                {proxy.latencyMs ? `${proxy.latencyMs}ms` : '—'}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AddTagPopover({
  knownTags,
  count,
  onAdd,
  disabled,
}: {
  knownTags: string[]
  count: number
  onAdd: (tag: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')

  function commit(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    setOpen(false)
    setValue('')
    onAdd(trimmed)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" label="Add tag" disabled={disabled}>
          <Tag className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] border-border bg-surface p-0">
        <div className="px-3 pt-3 pb-1.5">
          <SectionLabel>{`tag ${count} accounts`}</SectionLabel>
        </div>
        <form
          className="flex gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault()
            commit(value)
          }}
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="New tag"
            aria-label="New tag"
            autoFocus
            className="h-8 border-border bg-surface text-body"
          />
          <Button type="submit" size="sm" label="Add" disabled={!value.trim()} />
        </form>
        {knownTags.length > 0 && (
          <div className="border-t border-border">
            <div className="px-3 pt-2 pb-1">
              <SectionLabel>existing</SectionLabel>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              {knownTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => commit(tag)}
                  className="rounded-sm border border-border px-2 py-0.5 text-caption text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
