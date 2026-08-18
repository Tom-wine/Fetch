/**
 * CSV export.
 *
 * SECURITY: passwords are never exported — not the plaintext (which the client only
 * ever holds for ten seconds inside a PasswordCell) and not the mask either, since a
 * column of bullets in a spreadsheet is noise that looks like data. §8.3's
 * non-negotiable is that passwords are never written anywhere durable, and a file in
 * the operator's Downloads folder is as durable as it gets.
 */

export interface CsvColumn<T> {
  /** The header written to the file. Snake case, so a re-import maps cleanly. */
  header: string
  value: (row: T) => string | number | null | undefined
}

/**
 * RFC 4180 quoting. A note containing a comma, a club name containing a quote and a
 * field containing a newline all have to survive the round trip, because Part 5's
 * import wizard reads these files back.
 */
function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv<T>(columns: Array<CsvColumn<T>>, rows: T[]): string {
  const lines = [columns.map((c) => c.header).join(',')]
  for (const row of rows) lines.push(columns.map((c) => escape(c.value(row))).join(','))
  // CRLF, because Excel on Windows is the tool that opens these.
  return lines.join('\r\n')
}

export function downloadCsv<T>(filename: string, columns: Array<CsvColumn<T>>, rows: T[]): void {
  // The BOM is what stops Excel rendering `Kévin` as `KÃ©vin`.
  const blob = new Blob(['﻿', toCsv(columns, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
