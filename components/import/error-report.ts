import { toCsv, type CsvColumn } from '@/components/accounts/export-csv'
import type { ImportRow } from './validate'

/**
 * "Download error report (CSV)" — §8.3 step 4.
 *
 * The file holds ONLY the rows the API refused, written back exactly as they arrived,
 * with one appended `_error` column carrying the reason. The point is that the
 * operator fixes those rows in the same tool they built the file in and re-imports the
 * report itself — so the columns, the order and the header text all have to survive
 * the round trip untouched. A report that has been helpfully re-shaped is a report
 * that cannot be re-imported.
 *
 * ON PASSWORDS. `components/accounts/export-csv.ts` never exports a password, and it
 * is right not to: those values come out of Fetch.io's own store. This file is the
 * other case — every cell in it came off the operator's disk thirty seconds ago and is
 * being handed straight back. Blanking the password column would make the report
 * un-re-importable (every row would come back as "password missing") while removing
 * nothing from anybody's machine that was not already on it. So the rows go back
 * verbatim, and the UI says so in as many words next to the button.
 */

export const ERROR_COLUMN = '_error'

export interface FailedRow {
  row: ImportRow
  message: string
}

/**
 * @param headers the ORIGINAL CSV headers, so the report re-imports without remapping
 */
export function errorReportCsv(headers: string[], failures: FailedRow[]): string {
  const columns: Array<CsvColumn<FailedRow>> = headers.map((header, index) => ({
    header,
    value: (failure) => failure.row.raw[index] ?? '',
  }))

  columns.push({ header: ERROR_COLUMN, value: (failure) => failure.message })

  return toCsv(columns, failures)
}

export function downloadErrorReport(filename: string, headers: string[], failures: FailedRow[]) {
  // BOM first, CRLF inside — the two things that decide whether Excel opens this
  // correctly on the machine the operator is actually sitting at.
  const blob = new Blob(['﻿', errorReportCsv(headers, failures)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** `messy-500.csv` → `messy-500-errors.csv`; a paste gets a name of its own. */
export function errorReportName(source: string): string {
  const base = source.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `${base || 'import'}-errors.csv`
}
