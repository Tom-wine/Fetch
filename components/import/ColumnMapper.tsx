'use client'

import * as React from 'react'
import { AlertTriangle, ArrowRight, History } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Prose, SectionLabel } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Chip } from '@/components/domain/StatusChip'
import {
  FIELD_BY_ID,
  FIELDS,
  IGNORE,
  OPTIONAL_FIELDS,
  REQUIRED_FIELDS,
  SECRET_FIELDS,
  type FieldId,
  type Mapped,
} from './fields'
import { confidenceFor, setMappedField, type Mapping } from './automap'
import type { Confidence } from './fuzzy'

/**
 * Step 2 (§8.3): every detected header on the left with its first three values, a
 * Select of Fetch.io fields on the right, pre-selected by fuzzy auto-match.
 *
 * The sample values are the whole point of the left column. "Ref" could be a client
 * reference or a proxy label; `MU-7719043` settles it in a glance, and settling it in
 * a glance is the difference between mapping fifteen columns in ten seconds and
 * opening the file in another window to check.
 */

const DOT: Record<Confidence, { className: string; hint: string }> = {
  high: {
    className: 'bg-success',
    hint: 'This header and this field are the same word. Safe to leave alone.',
  },
  medium: {
    className: 'bg-warning',
    hint: 'A likely match. Glance at the sample values before you continue.',
  },
  manual: {
    className: 'bg-neutral-chip',
    hint: 'Not guessed — either you chose it, or nothing scored well enough to claim.',
  },
}

export function ColumnMapper({
  mapping,
  rows,
  onChange,
  recalled,
  className,
}: {
  mapping: Mapping
  /** The parsed data rows, for the three samples. */
  rows: string[][]
  onChange: (mapping: Mapping) => void
  /** True when this mapping came back from session memory rather than the matcher. */
  recalled: boolean
  className?: string
}) {
  const missing = React.useMemo(() => {
    const mapped = new Set(mapping.map((entry) => entry.field))
    return REQUIRED_FIELDS.filter((field) => !mapped.has(field.id))
  }, [mapping])

  const mappedCount = mapping.filter((entry) => entry.field !== IGNORE).length

  return (
    <div className={cn('space-y-4', className)}>
      {missing.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/12 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-mono text-btn font-semibold tracking-[0.06em] text-danger-ink uppercase">
              {missing.length === 1
                ? 'One required field is not mapped'
                : `${missing.length} required fields are not mapped`}
            </p>
            <Prose className="mt-1 text-muted">
              Point a column at{' '}
              {missing.map((field, index) => (
                <React.Fragment key={field.id}>
                  {index > 0 && (index === missing.length - 1 ? ' and ' : ', ')}
                  <span className="font-mono">{field.header}</span>
                </React.Fragment>
              ))}
              . Without {missing.length === 1 ? 'it' : 'them'} there is no account to create.
            </Prose>
          </div>
        </div>
      )}

      {recalled && missing.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/8 p-4">
          <History className="mt-0.5 size-4 shrink-0 text-primary-ink" aria-hidden="true" />
          <Prose className="text-muted">
            These columns are mapped the way you mapped them earlier in this session. Change
            anything you need to, or go straight on.
          </Prose>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2.5">
          <SectionLabel>column_mapping</SectionLabel>
          <span className="text-caption text-faint">
            {mappedCount} of {mapping.length} columns mapped
          </span>
        </div>

        <ul className="divide-y divide-border">
          {mapping.map((entry) => (
            <MapperRow
              key={entry.index}
              entry={entry}
              samples={sampleValues(rows, entry.index)}
              taken={mapping}
              onChange={(field) => onChange(setMappedField(mapping, entry.index, field))}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

/** First three non-empty values in a column — enough to recognise it, cheap to take. */
function sampleValues(rows: string[][], column: number): string[] {
  const out: string[] = []
  for (const row of rows) {
    const value = (row[column] ?? '').trim()
    if (value) out.push(value)
    if (out.length === 3) break
  }
  return out
}

function MapperRow({
  entry,
  samples,
  taken,
  onChange,
}: {
  entry: Mapping[number]
  samples: string[]
  taken: Mapping
  onChange: (field: Mapped) => void
}) {
  const confidence = confidenceFor(entry)
  const dot = DOT[confidence]
  const secret = entry.field !== IGNORE && SECRET_FIELDS.has(entry.field as FieldId)
  const spec = entry.field === IGNORE ? null : FIELD_BY_ID.get(entry.field as FieldId)

  return (
    <li className="grid grid-cols-1 items-center gap-3 px-4 py-3 md:grid-cols-[1fr_auto_260px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className={cn('size-2 shrink-0 rounded-full', dot.className)}
                  aria-label={`Match confidence: ${confidence}`}
                />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] font-prose text-prose">
                {dot.hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* The header is the operator's own text — verbatim, never snake_cased. */}
          <span className="truncate font-mono text-body text-text">{entry.header}</span>

          {spec?.required && <Chip tone="primary">REQUIRED</Chip>}
        </div>

        <p className="mt-1 truncate pl-4 text-caption text-faint">
          {samples.length === 0 ? (
            'Every value in this column is empty.'
          ) : (
            // A password column must not print three real passwords into the DOM
            // just because it is being mapped.
            <span className="csv-preview">
              {samples.map((value) => (secret ? mask() : value)).join('  ·  ')}
            </span>
          )}
        </p>
      </div>

      <ArrowRight className="hidden size-4 text-faint md:block" aria-hidden="true" />

      <Select value={entry.field} onValueChange={(value) => onChange(value as Mapped)}>
        <SelectTrigger
          aria-label={`Map the column ${entry.header}`}
          className={cn(
            'h-9 w-full border-border bg-surface text-body',
            entry.field === IGNORE && 'text-faint',
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-surface">
          <SelectItem value={IGNORE} className="text-body">
            Ignore this column
          </SelectItem>
          <SelectSeparator />
          {/* Radix requires a SelectGroup around every SelectLabel — the label is
              the group's accessible name, so a loose one has nothing to name. */}
          <SelectGroup>
            <SelectLabel className="font-mono text-label text-muted">REQUIRED</SelectLabel>
            {REQUIRED_FIELDS.map((field) => (
              <FieldOption key={field.id} id={field.id} taken={taken} current={entry.field} />
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel className="font-mono text-label text-muted">OPTIONAL</SelectLabel>
            {OPTIONAL_FIELDS.map((field) => (
              <FieldOption key={field.id} id={field.id} taken={taken} current={entry.field} />
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </li>
  )
}

/**
 * A field already claimed by another column still renders, annotated — hiding it
 * would leave the operator hunting for a field that is on screen twice.
 */
function FieldOption({ id, taken, current }: { id: FieldId; taken: Mapping; current: Mapped }) {
  const field = FIELDS.find((f) => f.id === id)!
  const claimedBy = taken.find((entry) => entry.field === id && entry.field !== current)

  return (
    <SelectItem value={id} className="text-body">
      <span className="flex w-full items-center gap-2">
        <span>{field.label}</span>
        {claimedBy && (
          <span className="text-caption text-faint">— taken by {claimedBy.header}</span>
        )}
      </span>
    </SelectItem>
  )
}

/** Same fixed-length mask the accounts table uses, so length is never published. */
const MASK = '••••••••••'

function mask(): string {
  return MASK
}
