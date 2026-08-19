'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertTriangle, Check, Eye, Loader2, RotateCw, Undo2, Wand2, X, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { getClub } from '@/lib/registries/clubs'
import type { ClubId } from '@/lib/types'
import { ClubSelect } from './ClubSelect'
import { resolveClub } from './club-match'
import { FIELDS, IGNORE, SECRET_FIELDS, type FieldId } from './fields'
import type { Mapping } from './automap'
import { ROW_FIELD, type Counts, type ImportRow, type Issue, type RowVerdict } from './validate'

/**
 * Step 3 (§8.3) — the screen this whole feature is judged on.
 *
 * Three things make it work rather than merely exist:
 *
 * 1. Every offending cell is EDITABLE where it sits. The alternative — "fix your file
 *    and upload it again" — is what makes people abandon imports, and it is what most
 *    competitors ship. Editing re-runs the whole rule set (see validate.ts, which is
 *    pure for exactly this reason), so the counters move as you type.
 * 2. The table VIRTUALISES past 200 rows. 500 rows × 8 columns is 4000 DOM nodes and a
 *    table that stutters on every keystroke; the window renders about 20 of them.
 * 3. Passwords are masked in every cell and revealed one at a time, on click, for ten
 *    seconds — §8.3's non-negotiable. The plaintext is in memory because it has to be
 *    posted; what it must never be is on screen behind someone's back.
 */

const ROW_HEIGHT = 38
const VIRTUALISE_ABOVE = 200
const REVEAL_MS = 10_000

export type PreviewFilter = 'all' | 'ready' | 'warning' | 'error' | 'excluded'
export type DuplicateChoice = 'skip' | 'update'

/** Per-field column width. Mono runs wide, so these are measured, not guessed. */
const WIDTHS: Partial<Record<FieldId, number>> = {
  email: 240,
  password: 150,
  club: 200,
  membership_type: 170,
  membership_id: 150,
  first_name: 130,
  last_name: 130,
  phone: 150,
  date_of_birth: 130,
  loyalty_points: 130,
  proxy: 230,
  imap_email: 220,
  imap_password: 150,
  tags: 160,
  notes: 260,
}

const ROW_NUMBER_WIDTH = 78
const ACTION_WIDTH = 44

export interface ValidationPreviewProps {
  rows: ImportRow[]
  verdicts: RowVerdict[]
  counts: Counts
  mapping: Mapping
  filter: PreviewFilter
  onFilterChange: (filter: PreviewFilter) => void
  onEdit: (index: number, field: FieldId, value: string) => void
  onToggleExcluded: (index: number) => void
  onExcludeErrors: () => void
  onAutoFixClubs: () => void
  duplicateChoice: DuplicateChoice
  onDuplicateChoiceChange: (choice: DuplicateChoice) => void
  dryRun: { pending: boolean; error: string | null; done: boolean }
  onRetryDryRun: () => void
}

export function ValidationPreview(props: ValidationPreviewProps) {
  const { rows, verdicts, counts, mapping, filter, onFilterChange } = props

  /** Only the fields an actual column points at — a fifteen-wide table of blanks helps nobody. */
  const columns = React.useMemo(() => {
    const mapped = new Set(mapping.filter((entry) => entry.field !== IGNORE).map((e) => e.field))
    return FIELDS.filter((field) => mapped.has(field.id)).map((field) => field.id)
  }, [mapping])

  const visible = React.useMemo(() => {
    if (filter === 'all') return verdicts
    if (filter === 'excluded') return verdicts.filter((v) => v.excluded)
    // An excluded row is not ready, not a warning and not an error — it is out.
    const included = verdicts.filter((v) => !v.excluded)
    if (filter === 'ready') return included.filter((v) => v.level === 'ready')
    if (filter === 'warning') return included.filter((v) => v.level === 'warning')
    return included.filter((v) => v.level === 'error')
  }, [verdicts, filter])

  return (
    <div className="space-y-4">
      <Counters counts={counts} total={rows.length} filter={filter} onChange={onFilterChange} />

      <Banners {...props} />

      <PreviewTable
        rows={rows}
        visible={visible}
        columns={columns}
        onEdit={props.onEdit}
        onToggleExcluded={props.onToggleExcluded}
        filter={filter}
        onClearFilter={() => onFilterChange('all')}
      />
    </div>
  )
}

/* -------------------------------------------------------------- counters */

const COUNTER_STYLES: Record<
  Exclude<PreviewFilter, 'all'>,
  { active: string; idle: string; label: string }
> = {
  excluded: {
    active: 'border-border-strong bg-surface-hover text-text',
    idle: 'border-border bg-surface text-muted hover:border-border-strong hover:text-text',
    label: 'left out',
  },
  ready: {
    active: 'border-success/40 bg-success/15 text-success-ink',
    idle: 'border-border bg-surface text-muted hover:border-success/30 hover:text-success-ink',
    label: 'ready',
  },
  warning: {
    active: 'border-warning/40 bg-warning/15 text-warning-ink',
    idle: 'border-border bg-surface text-muted hover:border-warning/30 hover:text-warning-ink',
    label: 'warnings',
  },
  error: {
    active: 'border-danger/40 bg-danger/15 text-danger-ink',
    idle: 'border-border bg-surface text-muted hover:border-danger/30 hover:text-danger-ink',
    label: 'errors',
  },
}

function Counters({
  counts,
  total,
  filter,
  onChange,
}: {
  counts: Counts
  total: number
  filter: PreviewFilter
  onChange: (filter: PreviewFilter) => void
}) {
  const entries: Array<{ key: Exclude<PreviewFilter, 'all'>; value: number }> = [
    { key: 'ready', value: counts.ready },
    { key: 'warning', value: counts.warning },
    { key: 'error', value: counts.error },
  ]
  // Only ever shown once there is something in it — an operator who has excluded
  // nothing does not need a counter reading zero.
  if (counts.excluded > 0 || filter === 'excluded') {
    entries.push({ key: 'excluded', value: counts.excluded })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(({ key, value }) => {
        const style = COUNTER_STYLES[key]
        const active = filter === key
        return (
          <button
            key={key}
            type="button"
            // Clicking the active counter clears the filter — the second click on a
            // toggle should always undo the first.
            onClick={() => onChange(active ? 'all' : key)}
            aria-pressed={active}
            disabled={value === 0 && !active}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-body transition-colors duration-150 disabled:opacity-40 disabled:hover:border-border',
              active ? style.active : style.idle,
            )}
          >
            <span className="text-title font-semibold tabular-nums">{value.toLocaleString()}</span>
            <span className="text-caption uppercase">{style.label}</span>
          </button>
        )
      })}

      <span className="ml-auto text-caption text-faint">
        {filter === 'all'
          ? `${total.toLocaleString()} rows in this file`
          : `showing ${COUNTER_STYLES[filter].label} only`}
      </span>
    </div>
  )
}

/* --------------------------------------------------------------- banners */

function Banners({
  counts,
  onAutoFixClubs,
  onExcludeErrors,
  onFilterChange,
  duplicateChoice,
  onDuplicateChoiceChange,
  dryRun,
  onRetryDryRun,
}: ValidationPreviewProps) {
  return (
    <div className="space-y-3">
      {counts.error > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/12 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden="true" />
            <Prose className="text-muted">
              {counts.error === 1
                ? 'One row cannot be imported as it stands.'
                : `${counts.error.toLocaleString()} rows cannot be imported as they stand.`}{' '}
              Fix them below — every tinted cell is editable — or leave them out and import the
              rest. Whatever is left out comes back in the error report at the end.
            </Prose>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              label="Show them"
              onClick={() => onFilterChange('error')}
            />
            {/* The escape hatch that makes a 5000-row file importable at all. Without
                it, three junk rows out of five thousand mean going back to Excel —
                which is exactly the abandonment this screen exists to prevent. It does
                not weaken the rule that no ERROR may be imported: a row left out is
                not imported, it is reported. */}
            <Button
              type="button"
              variant="danger"
              label="Leave them out"
              count={counts.error}
              onClick={onExcludeErrors}
            >
              <XCircle className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {counts.autoFixableClubs > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/8 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <Wand2 className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
            <Prose className="text-muted">
              {counts.autoFixableClubs === 1
                ? 'One row names its club in a way we recognise but do not store — "Man Utd" rather than Manchester United.'
                : `${counts.autoFixableClubs} rows name their club in a way we recognise but do not store — "Man Utd" rather than Manchester United.`}{' '}
              Every one of them matched a single club with high confidence.
            </Prose>
          </div>
          <Button
            type="button"
            variant="secondary"
            label="Fix all clubs automatically"
            count={counts.autoFixableClubs}
            onClick={onAutoFixClubs}
          >
            <Wand2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {counts.duplicates > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/12 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden="true" />
            <Prose className="text-muted">
              {counts.duplicates === 1
                ? 'One email in this file already has an account.'
                : `${counts.duplicates} emails in this file already have accounts.`}{' '}
              Decide once what happens to them.
            </Prose>
          </div>
          <div
            role="radiogroup"
            aria-label="What to do with rows that already have an account"
            className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface p-1"
          >
            {(
              [
                { value: 'skip', label: 'Skip them' },
                { value: 'update', label: 'Update existing' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={duplicateChoice === option.value}
                onClick={() => onDuplicateChoiceChange(option.value)}
                className={cn(
                  'rounded-sm px-3 py-1 font-mono text-btn font-semibold tracking-[0.06em] uppercase transition-colors duration-150',
                  duplicateChoice === option.value
                    ? 'bg-primary-solid text-white'
                    : 'text-muted hover:bg-surface-hover hover:text-text',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {dryRun.error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised p-4">
          <div className="flex min-w-0 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-ink" aria-hidden="true" />
            <Prose className="text-muted">
              These rows could not be checked against the accounts you already have, so a row that
              would collide with one is not flagged below. {dryRun.error}
            </Prose>
          </div>
          <Button type="button" variant="secondary" label="Check again" onClick={onRetryDryRun}>
            <RotateCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {dryRun.pending && (
        <p className="flex items-center gap-2 text-caption text-faint">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Checking these emails against the accounts you already have.
        </p>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- table */

function PreviewTable({
  rows,
  visible,
  columns,
  onEdit,
  onToggleExcluded,
  filter,
  onClearFilter,
}: {
  rows: ImportRow[]
  visible: RowVerdict[]
  columns: FieldId[]
  onEdit: (index: number, field: FieldId, value: string) => void
  onToggleExcluded: (index: number) => void
  filter: PreviewFilter
  onClearFilter: () => void
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const virtualise = visible.length > VIRTUALISE_ABOVE

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: virtualise,
  })

  const totalWidth =
    ROW_NUMBER_WIDTH + ACTION_WIDTH + columns.reduce((sum, id) => sum + (WIDTHS[id] ?? 150), 0)
  const items = virtualizer.getVirtualItems()

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2.5">
        <SectionLabel>validate_and_preview</SectionLabel>
        <span className="text-caption text-faint">
          {virtualise
            ? `${visible.length.toLocaleString()} rows, windowed — click any tinted cell to fix it`
            : 'Click any tinted cell to fix it'}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Prose className="text-muted">
            {filter === 'error'
              ? 'No row in this file has an error. That is the good outcome.'
              : filter === 'warning'
                ? 'No row in this file has a warning.'
                : filter === 'excluded'
                  ? 'Nothing has been left out of this import.'
                  : 'No row is ready yet — every row still has something to fix.'}
          </Prose>
          <Button type="button" variant="secondary" label="Show every row" onClick={onClearFilter} />
        </div>
      ) : (
        <div ref={scrollRef} className="max-h-[46vh] min-h-[220px] overflow-auto">
          <div style={{ width: totalWidth, minWidth: '100%' }}>
            {/* Sticky header inside the scroller, so it survives both axes. */}
            <div className="sticky top-0 z-10 flex border-b border-border bg-surface-raised">
              <HeaderCell width={ROW_NUMBER_WIDTH}>ROW</HeaderCell>
              {columns.map((id) => (
                <HeaderCell key={id} width={WIDTHS[id] ?? 150}>
                  {id.toUpperCase()}
                </HeaderCell>
              ))}
              <HeaderCell width={ACTION_WIDTH}>
                <span className="sr-only">Leave a row out of this import</span>
              </HeaderCell>
            </div>

            {virtualise ? (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {items.map((item) => {
                  const verdict = visible[item.index]!
                  return (
                    <div
                      key={verdict.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: item.size,
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      <PreviewRow
                        row={rows[verdict.index]!}
                        verdict={verdict}
                        columns={columns}
                        onEdit={onEdit}
                        onToggleExcluded={onToggleExcluded}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              visible.map((verdict) => (
                <PreviewRow
                  key={verdict.index}
                  row={rows[verdict.index]!}
                  verdict={verdict}
                  columns={columns}
                  onEdit={onEdit}
                  onToggleExcluded={onToggleExcluded}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HeaderCell({ width, children }: { width: number; children: React.ReactNode }) {
  return (
    <div
      style={{ width, minWidth: width }}
      className="shrink-0 px-3 py-2 font-mono text-label text-muted"
    >
      {children}
    </div>
  )
}

const LEVEL_MARK: Record<RowVerdict['level'], string> = {
  ready: 'text-faint',
  warning: 'text-warning-ink',
  error: 'text-danger-ink',
}

function PreviewRow({
  row,
  verdict,
  columns,
  onEdit,
  onToggleExcluded,
}: {
  row: ImportRow
  verdict: RowVerdict
  columns: FieldId[]
  onEdit: (index: number, field: FieldId, value: string) => void
  onToggleExcluded: (index: number) => void
}) {
  const rowIssue = verdict.byField[ROW_FIELD]

  return (
    <div
      className={cn(
        'flex h-[38px] items-stretch border-b border-border last:border-0',
        // Faded rather than hidden: an operator has to be able to see what they took
        // out of the import, and put it back.
        verdict.excluded && 'opacity-45',
      )}
      data-level={verdict.excluded ? 'excluded' : verdict.level}
    >
      <div
        style={{ width: ROW_NUMBER_WIDTH, minWidth: ROW_NUMBER_WIDTH }}
        className="flex shrink-0 items-center gap-1.5 px-3"
      >
        {/* Row 1 of the file is the first row UNDER the header — the number the
            operator will look for in Excel is this one plus the header line. */}
        <span className="text-caption text-faint tabular-nums">{verdict.index + 1}</span>
        {rowIssue ? (
          <IssueMark issue={rowIssue} />
        ) : (
          <span className={cn('text-caption', LEVEL_MARK[verdict.level])} aria-hidden="true">
            {verdict.level === 'ready' ? '·' : verdict.level === 'warning' ? '!' : '×'}
          </span>
        )}
      </div>

      {columns.map((field) => (
        <PreviewCell
          key={field}
          field={field}
          width={WIDTHS[field] ?? 150}
          value={row.values[field] ?? ''}
          // A row that is not being imported has no problems worth tinting.
          issue={verdict.excluded ? undefined : verdict.byField[field]}
          onCommit={(next) => onEdit(row.index, field, next)}
        />
      ))}

      <div
        style={{ width: ACTION_WIDTH, minWidth: ACTION_WIDTH }}
        className="flex shrink-0 items-center justify-center"
      >
        <button
          type="button"
          onClick={() => onToggleExcluded(row.index)}
          aria-label={
            verdict.excluded
              ? `Put row ${verdict.index + 1} back into the import`
              : `Leave row ${verdict.index + 1} out of the import`
          }
          title={verdict.excluded ? 'Put this row back' : 'Leave this row out'}
          className="flex size-6 items-center justify-center rounded-sm text-faint transition-colors duration-150 hover:bg-surface-hover hover:text-text"
        >
          {verdict.excluded ? (
            <Undo2 className="size-3.5" aria-hidden="true" />
          ) : (
            <XCircle className="size-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  )
}

function IssueMark({ issue }: { issue: Issue }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              'text-caption',
              issue.level === 'error' ? 'text-danger-ink' : 'text-warning-ink',
            )}
          >
            {issue.level === 'error' ? '×' : '!'}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] font-prose text-prose">
          {issue.message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* ------------------------------------------------------------------ cell */

function PreviewCell({
  field,
  width,
  value,
  issue,
  onCommit,
}: {
  field: FieldId
  width: number
  value: string
  issue: Issue | undefined
  onCommit: (value: string) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const secret = SECRET_FIELDS.has(field)

  const tint =
    issue?.level === 'error'
      ? 'bg-danger/15 text-danger-ink'
      : issue?.level === 'warning'
        ? 'bg-warning/15 text-warning-ink'
        : ''

  if (editing) {
    return (
      <div style={{ width, minWidth: width }} className="shrink-0 p-0.5">
        {field === 'club' ? (
          <ClubEditor
            value={value}
            onCommit={(next) => {
              onCommit(next)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <TextEditor
            value={value}
            secret={secret}
            onCommit={(next) => {
              onCommit(next)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    )
  }

  const body = (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={issue ? undefined : 'Click to edit'}
      className={cn(
        'flex h-full w-full items-center gap-1.5 px-3 text-left text-body transition-colors duration-150',
        tint || 'text-muted hover:bg-surface-hover hover:text-text',
      )}
    >
      {field === 'club' && !issue ? (
        <ClubValue value={value} />
      ) : (
        <span className="csv-preview min-w-0 flex-1 truncate">
          {secret ? <SecretValue value={value} /> : value || <span className="text-faint">—</span>}
        </span>
      )}
      {issue?.fix && <span className="shrink-0 text-caption underline">fix</span>}
    </button>
  )

  if (!issue) {
    return (
      <div style={{ width, minWidth: width }} className="shrink-0 border-r border-border/60 last:border-0">
        {body}
      </div>
    )
  }

  return (
    <div style={{ width, minWidth: width }} className="shrink-0 border-r border-border/60 last:border-0">
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{body}</TooltipTrigger>
          <TooltipContent className="max-w-[300px] font-prose text-prose">
            <span className="block">{issue.message}</span>
            {issue.fix && (
              <button
                type="button"
                onClick={() => onCommit(issue.fix!.value)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-primary-solid px-2 py-1 font-mono text-btn font-semibold tracking-[0.06em] text-white uppercase"
              >
                <Check className="size-3" aria-hidden="true" />
                Use {issue.fix.label}
              </button>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

/** The crest next to a club that already resolves — confirmation at a glance. */
function ClubValue({ value }: { value: string }) {
  const match = resolveClub(value)
  if (match.status !== 'exact') {
    return <span className="min-w-0 flex-1 truncate">{value || <span className="text-faint">—</span>}</span>
  }
  return <ClubBadge club={match.club.id} variant="short" size="sm" className="min-w-0 flex-1" />
}

/**
 * §8.3's non-negotiable, at the cell: masked by default, revealed on an explicit
 * click, re-masked after ten seconds. A fixed-length mask, so the column does not
 * quietly publish how long each password is.
 */
function SecretValue({ value }: { value: string }) {
  const [shown, setShown] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  if (!value) return <span className="text-faint">—</span>

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation()
        setShown(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setShown(false), REVEAL_MS)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          setShown(true)
        }
      }}
      className="inline-flex items-center gap-1.5"
      title={shown ? 'Hides again in a few seconds' : 'Click to reveal for ten seconds'}
    >
      {shown ? value : '••••••••••'}
      {!shown && <Eye className="size-3 shrink-0 opacity-50" aria-hidden="true" />}
    </span>
  )
}

function TextEditor({
  value,
  secret,
  onCommit,
  onCancel,
}: {
  value: string
  secret: boolean
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = React.useState(value)

  return (
    <Input
      autoFocus
      // A password being corrected is still a password: it does not go on screen
      // just because the operator is retyping the one next to it.
      type={secret ? 'password' : 'text'}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onCommit(draft)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      className="h-full w-full rounded-sm border-primary bg-surface px-2 text-body"
    />
  )
}

function ClubEditor({
  value,
  onCommit,
  onCancel,
}: {
  value: string
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const match = resolveClub(value)
  const current: ClubId | null = match.status === 'exact' ? match.club.id : null

  return (
    <div className="flex h-full items-center gap-1">
      <ClubSelect
        value={current}
        onChange={(club) => onCommit(getClub(club).name)}
        placeholder="Pick a club"
        className="h-full"
      />
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="flex size-6 shrink-0 items-center justify-center rounded-sm text-faint hover:text-text"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
