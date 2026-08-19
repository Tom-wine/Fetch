'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ArrowLeft, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useBulkImport, useImportDryRun } from '@/lib/api/hooks/useAccounts'
import { useProxies } from '@/lib/api/hooks/useDashboard'
import type { BulkImportResult } from '@/lib/types'
import { autoMap, missingRequired, type Mapping } from './automap'
import { ColumnMapper } from './ColumnMapper'
import { CsvDropzone } from './CsvDropzone'
import { ImportProgress, ImportSummary } from './ImportResult'
import { recallMapping, rememberMapping } from './mapping-memory'
import type { ParsedCsv } from './parse'
import { Stepper, type StepDefinition } from './Stepper'
import {
  ValidationPreview,
  type DuplicateChoice,
  type PreviewFilter,
} from './ValidationPreview'
import type { FieldId } from './fields'
import {
  autoClubFixes,
  buildRows,
  firstProblem,
  mergeEdits,
  toBulkRow,
  toValidateRow,
  validateRows,
  type Edits,
  type ImportRow,
  type RowVerdict,
} from './validate'

/**
 * §8.3's four-step CSV import, and the state that ties the steps together.
 *
 * The wizard is deliberately one component holding one piece of state per step rather
 * than four screens each owning a slice: going BACK from validation to the mapper has
 * to keep the parsed file, the mapping and every inline fix intact, and the only
 * version of that which does not leak is a single owner.
 *
 * `edits` is that owner's most important field. Nothing ever rewrites the parsed rows;
 * an inline fix is an overlay applied at read time in `buildRows`, so the error report
 * can still write the row back EXACTLY as it arrived, and "undo" would be a delete
 * from one map rather than a re-parse.
 */

const STEPS: StepDefinition[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'map', label: 'Map columns' },
  { id: 'validate', label: 'Validate' },
  { id: 'result', label: 'Result' },
]

export function BulkImportTab({
  /** Raised whenever closing the wizard would lose work or interrupt a write. */
  onBusyChange,
  onClose,
  className,
}: {
  onBusyChange?: (busy: boolean) => void
  onClose?: () => void
  className?: string
}) {
  const [step, setStep] = React.useState(0)
  const [parsed, setParsed] = React.useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = React.useState<Mapping>([])
  const [recalled, setRecalled] = React.useState(false)
  const [edits, setEdits] = React.useState<Edits>({})
  const [filter, setFilter] = React.useState<PreviewFilter>('all')
  const [duplicateChoice, setDuplicateChoice] = React.useState<DuplicateChoice>('skip')
  const [existingEmails, setExistingEmails] = React.useState<Map<string, string>>(new Map())
  const [progress, setProgress] = React.useState({ done: 0, total: 0 })
  const [result, setResult] = React.useState<BulkImportResult | null>(null)
  /**
   * Rows the operator has taken out of this import. Kept as indices into the parsed
   * file rather than as a filtered copy of the rows, so restoring one is a delete
   * from a Set and every row number on screen still means the same line of their CSV.
   */
  const [excluded, setExcluded] = React.useState<ReadonlySet<number>>(() => new Set())
  /** What was actually sent, captured at commit time — step 4 reads it, not `rows`. */
  const [committed, setCommitted] = React.useState<{
    sent: ImportRow[]
    left: Array<{ row: ImportRow; message: string }>
  } | null>(null)

  // The proxy list turns `host:port:user:pass` into an account's proxyId, and tells
  // the operator when a proxy in the file is not one they have. Memoised because it
  // is a dependency of the 500-row validation pass — a fresh [] on every render
  // would re-validate the whole file on every render.
  const proxiesQuery = useProxies({ pageSize: 100 })
  const proxies = React.useMemo(() => proxiesQuery.data?.data ?? [], [proxiesQuery.data])

  const dryRun = useImportDryRun()
  const bulkImport = useBulkImport()

  /* ------------------------------------------------------------- derived */

  const rows = React.useMemo(
    () => (parsed ? buildRows(parsed.rows, mapping, edits) : []),
    [parsed, mapping, edits],
  )

  const { verdicts, counts } = React.useMemo(
    () =>
      validateRows(rows, {
        existingEmails,
        proxies,
        headerCount: parsed?.headers.length ?? 0,
        excluded,
      }),
    [rows, existingEmails, proxies, parsed, excluded],
  )

  const missing = React.useMemo(() => missingRequired(mapping), [mapping])
  /** The rows that will actually be sent, in file order. */
  const included = React.useMemo(
    () => rows.filter((row) => !excluded.has(row.index)),
    [rows, excluded],
  )
  const importable = counts.error === 0 && included.length > 0

  /* ------------------------------------------------------------ busy flag */

  const dirty = parsed !== null && result === null
  React.useEffect(() => {
    onBusyChange?.(dirty || bulkImport.isPending)
  }, [dirty, bulkImport.isPending, onBusyChange])

  /* --------------------------------------------------------------- step 1 */

  const onParsed = React.useCallback((next: ParsedCsv) => {
    const remembered = recallMapping(next.headers)
    setParsed(next)
    setMapping(remembered ?? autoMap(next.headers))
    setRecalled(remembered !== null)
    setEdits({})
    setExcluded(new Set())
    setExistingEmails(new Map())
    setResult(null)
    setCommitted(null)
    dryRun.reset()
    setStep(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --------------------------------------------------------------- step 3 */

  const runDryRun = React.useCallback(() => {
    if (rows.length === 0) return
    dryRun.mutate(
      { rows: rows.map(toValidateRow) },
      { onSuccess: (data) => setExistingEmails(data.existingEmails) },
    )
    // Fired from an effect and a button; `rows` is the only input that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length])

  // Once per file, on arrival at step 3. Editing a cell afterwards re-runs the local
  // rules against the set this returned — no second round trip per keystroke.
  const dryRunFor = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (step !== 2 || !parsed) return
    const key = `${parsed.source}:${rows.length}`
    if (dryRunFor.current === key) return
    dryRunFor.current = key
    runDryRun()
  }, [step, parsed, rows.length, runDryRun])

  const applyEdit = React.useCallback((index: number, field: FieldId, value: string) => {
    setEdits((current) => ({ ...current, [index]: { ...current[index], [field]: value } }))
  }, [])

  const fixAllClubs = React.useCallback(() => {
    const patch = autoClubFixes(verdicts)
    const count = Object.keys(patch).length
    setEdits((current) => mergeEdits(current, patch))
    toast.success(`${count} ${count === 1 ? 'club' : 'clubs'} corrected.`)
  }, [verdicts])

  const toggleExcluded = React.useCallback((index: number) => {
    setExcluded((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const excludeErrors = React.useCallback(() => {
    const failing = verdicts.filter((verdict) => !verdict.excluded && verdict.level === 'error')
    setExcluded((current) => {
      const next = new Set(current)
      for (const verdict of failing) next.add(verdict.index)
      return next
    })
    toast.success(
      `${failing.length} ${failing.length === 1 ? 'row' : 'rows'} left out. They are in the error report at the end.`,
    )
  }, [verdicts])

  /* --------------------------------------------------------------- step 4 */

  const commit = React.useCallback(() => {
    if (!parsed || !importable) return

    if (included.length === 0) {
      toast.error('Every row has been left out. There is nothing to import.')
      return
    }

    // Captured now, because step 4 reports on WHAT WAS SENT. `rows` and `excluded`
    // keep living behind the summary, and a report built from them after the fact
    // would describe a different import from the one that ran.
    const byIndex = new Map<number, RowVerdict>(verdicts.map((verdict) => [verdict.index, verdict]))
    setCommitted({
      sent: included,
      left: rows
        .filter((row) => excluded.has(row.index))
        .map((row) => ({
          row,
          message: byIndex.get(row.index)
            ? firstProblem(byIndex.get(row.index)!)
            : 'This row was left out of the import.',
        })),
    })

    const payload = included.map((row) => toBulkRow(row, proxies))

    rememberMapping(parsed.headers, mapping)
    setProgress({ done: 0, total: payload.length })
    setStep(3)

    bulkImport.mutate(
      {
        rows: payload,
        onDuplicate: duplicateChoice,
        onProgress: (done, total) => setProgress({ done, total }),
      },
      {
        onSuccess: (summary) => {
          setResult(summary)
          const touched = summary.created + summary.updated
          if (summary.errors.length === 0) {
            toast.success(
              `${touched} ${touched === 1 ? 'account' : 'accounts'} imported from ${parsed.source}.`,
            )
          } else {
            toast.warning(
              `${touched} imported, ${summary.errors.length} refused. Download the error report to see why.`,
            )
          }
        },
        onError: (error) => {
          toast.error(error.message)
          setStep(2)
        },
      },
    )
  }, [parsed, importable, rows, included, excluded, verdicts, proxies, mapping, duplicateChoice, bulkImport])

  const startOver = React.useCallback(() => {
    setStep(0)
    setParsed(null)
    setMapping([])
    setRecalled(false)
    setEdits({})
    setExcluded(new Set())
    setFilter('all')
    setExistingEmails(new Map())
    setResult(null)
    setCommitted(null)
    setProgress({ done: 0, total: 0 })
    dryRunFor.current = null
    dryRun.reset()
    bulkImport.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ----------------------------------------------------------------- view */

  const furthest = result ? 3 : parsed ? 2 : 0

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="border-b border-border px-6 py-4">
        <Stepper
          steps={STEPS}
          current={step}
          furthest={Math.min(furthest, step === 3 && !result ? 3 : furthest)}
          onSelect={(index) => {
            // Never step back into a commit that is still running.
            if (bulkImport.isPending) return
            setStep(index)
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {step === 0 && <CsvDropzone onParsed={onParsed} />}

        {step === 1 && parsed && (
          <ColumnMapper
            mapping={mapping}
            rows={parsed.rows}
            recalled={recalled}
            onChange={(next) => {
              setMapping(next)
              setRecalled(false)
              // The mapping decides what every cell MEANS, so an edit made under the
              // old mapping would be applied to the wrong field. Dropping them is the
              // honest option, and remapping mid-import is rare.
              setEdits({})
              dryRunFor.current = null
            }}
          />
        )}

        {step === 2 && parsed && (
          <ValidationPreview
            rows={rows}
            verdicts={verdicts}
            counts={counts}
            mapping={mapping}
            filter={filter}
            onFilterChange={setFilter}
            onEdit={applyEdit}
            onToggleExcluded={toggleExcluded}
            onExcludeErrors={excludeErrors}
            onAutoFixClubs={fixAllClubs}
            duplicateChoice={duplicateChoice}
            onDuplicateChoiceChange={setDuplicateChoice}
            dryRun={{
              pending: dryRun.isPending,
              error: dryRun.error ? dryRun.error.message : null,
              done: dryRun.isSuccess,
            }}
            onRetryDryRun={runDryRun}
          />
        )}

        {step === 3 &&
          parsed &&
          (result && committed ? (
            <ImportSummary
              result={result}
              sent={committed.sent}
              leftOut={committed.left}
              headers={parsed.headers}
              source={parsed.source}
              onImportAnother={startOver}
              onClose={onClose}
            />
          ) : (
            <ImportProgress done={progress.done} total={progress.total} />
          ))}
      </div>

      {step < 3 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-raised px-6 py-3">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="ghost"
                label="Back"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </Button>
            )}
            {parsed && (
              <Button type="button" variant="ghost" label="Start over" onClick={startOver}>
                <RotateCcw className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 1 && missing.length > 0 && (
              <span className="text-caption text-danger-ink">
                Map every required field to continue.
              </span>
            )}
            {step === 2 && counts.error > 0 && (
              <span className="text-caption text-danger-ink">
                {counts.error.toLocaleString()}{' '}
                {counts.error === 1 ? 'row still has an error' : 'rows still have errors'}.
              </span>
            )}

            {step === 1 && (
              <Button
                type="button"
                variant="default"
                label="Continue"
                forward
                disabled={missing.length > 0}
                onClick={() => setStep(2)}
              />
            )}

            {step === 2 && (
              // The label always carries the exact live count (§8.3).
              <Button
                type="button"
                variant="gradient"
                label="Import accounts"
                count={included.length}
                forward
                disabled={!importable || dryRun.isPending}
                onClick={commit}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
