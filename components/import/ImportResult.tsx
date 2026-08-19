'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Download, FileUp, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'
import type { BulkImportResult } from '@/lib/types'
import { downloadErrorReport, errorReportName, type FailedRow } from './error-report'
import type { ImportRow } from './validate'

/**
 * Step 4 (§8.3): the progress bar during the commit, then the summary.
 *
 * The progress is real, not theatre — `useBulkImport` posts in chunks of 200 and
 * reports after each one, so the bar tracks rows actually written. A fake bar that
 * finishes before the request does is worse than no bar, because the operator closes
 * the tab.
 */

export function ImportProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-md bg-fetch-gradient">
        <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" />
      </span>

      <div className="space-y-1">
        <Display as="h2" size="h2" className="text-text">
          IMPORTING
        </Display>
        <Prose className="text-muted">
          {done.toLocaleString()} of {total.toLocaleString()} rows written. Leave this open until it
          finishes.
        </Prose>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Import progress"
        className="h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className="h-full rounded-full bg-fetch-gradient transition-[width] duration-200 ease-out"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <span className="font-mono text-caption text-faint tabular-nums">{percent}%</span>
    </div>
  )
}

const TILES: Array<{
  key: keyof Pick<BulkImportResult, 'created' | 'updated' | 'skipped'>
  label: string
  tone: string
  hint: string
}> = [
  {
    key: 'created',
    label: 'imported',
    tone: 'border-success/30 bg-success/12 text-success-ink',
    hint: 'New accounts. They start as NEEDS_LOGIN until their first sign-in.',
  },
  {
    key: 'updated',
    label: 'updated',
    tone: 'border-primary/25 bg-primary/8 text-primary-ink',
    hint: 'Accounts that already existed and were overwritten with the values in your file.',
  },
  {
    key: 'skipped',
    label: 'skipped',
    tone: 'border-border bg-surface-raised text-muted',
    hint: 'Accounts that already existed and were left exactly as they were.',
  },
]

export function ImportSummary({
  result,
  sent,
  leftOut,
  headers,
  source,
  onImportAnother,
  onClose,
  className,
}: {
  result: BulkImportResult
  /** Exactly the rows that were posted, in the order they were posted. */
  sent: ImportRow[]
  /** Rows the operator took out in step 3, with the reason they took them out. */
  leftOut: FailedRow[]
  /** The original CSV headers, so the error report re-imports without remapping. */
  headers: string[]
  source: string
  onImportAnother: () => void
  onClose?: () => void
  className?: string
}) {
  /**
   * Two things failed, and the operator does not care which was which — they want one
   * file holding every row that did not become an account. So the report is the rows
   * the API refused PLUS the rows they left out in step 3, back in file order.
   */
  const failures = React.useMemo<FailedRow[]>(() => {
    const refused = result.errors
      // `row` is 1-based over the posted array; useBulkImport has already shifted each
      // chunk's numbers back onto that one whole numbering.
      .map((error) => ({ row: sent[error.row - 1], message: error.message }))
      .filter((failure): failure is FailedRow => Boolean(failure.row))

    return [...refused, ...leftOut].sort((a, b) => a.row.index - b.row.index)
  }, [result.errors, sent, leftOut])

  const touched = result.created + result.updated

  return (
    <div className={cn('space-y-6 px-1 py-2', className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-md bg-fetch-gradient">
          <FileUp className="size-5 text-white" aria-hidden="true" />
        </span>
        <Display as="h2" size="h2" className="text-text">
          {touched > 0 ? 'IMPORT_COMPLETE' : 'NOTHING_WAS_IMPORTED'}
        </Display>
        <Prose className="max-w-lg text-muted">
          {touched > 0
            ? `${source} finished. Every account below is on /accounts now.`
            : `${source} produced no new accounts. The rows below explain why.`}
        </Prose>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TILES.map((tile) => (
          <div key={tile.key} className={cn('rounded-lg border p-4', tile.tone)}>
            <div className="text-kpi font-semibold tabular-nums">
              {result[tile.key].toLocaleString()}
            </div>
            <SectionLabel className="mt-1 text-current opacity-80">{tile.label}</SectionLabel>
            <Prose className="mt-2 text-muted">{tile.hint}</Prose>
          </div>
        ))}
      </div>

      {failures.length > 0 && (
        <div className="space-y-3 rounded-lg border border-danger/30 bg-danger/12 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-mono text-btn font-semibold tracking-[0.06em] text-danger-ink uppercase">
                {failures.length === 1
                  ? '1 row did not become an account'
                  : `${failures.length.toLocaleString()} rows did not become accounts`}
              </p>
              <Prose className="mt-1 text-muted">
                The report holds only those rows, written back exactly as they arrived with one
                extra <span className="font-mono">_error</span> column saying why. Fix them in your
                spreadsheet and import the report itself — the columns already line up, so it needs
                no remapping.
              </Prose>
            </div>
          </div>

          <ul className="space-y-1">
            {failures.slice(0, 5).map((failure) => (
              <li key={failure.row.index} className="flex gap-2 text-body text-muted">
                <span className="shrink-0 text-faint tabular-nums">
                  row {failure.row.index + 1}
                </span>
                <span className="min-w-0 truncate">{failure.message}</span>
              </li>
            ))}
            {failures.length > 5 && (
              <li className="text-caption text-faint">
                …and {failures.length - 5} more, all of them in the report.
              </li>
            )}
          </ul>

          <Button
            type="button"
            variant="danger"
            label="Download error report"
            count={failures.length}
            onClick={() => downloadErrorReport(errorReportName(source), headers, failures)}
          >
            <Download className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="gradient" label="Go to accounts" forward onClick={onClose}>
          <Link href="/accounts">
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          label="Import another file"
          onClick={onImportAnother}
        >
          <FileUp className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
