'use client'

import Papa from 'papaparse'

/**
 * Reading and parsing the operator's file.
 *
 * NON-NEGOTIABLE (§8.3): parsing happens OFF THE MAIN THREAD. `Papa.parse` is called
 * with `worker: true`, which builds a Blob worker from papaparse's own module factory
 * (`moduleFactory.toString()`) — so it survives bundling, and 5000 rows never block
 * the paint. Only plain, structured-cloneable config may cross that boundary, which is
 * why nothing here passes `transform` / `transformHeader`: the header row is taken as
 * data (`header: false`) and interpreted afterwards. That also keeps ragged rows
 * visible — with `header: true` papaparse pads them silently and the §8.3 "row
 * longer/shorter than the header" rule would have nothing to report.
 */

export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 5000
export const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt']

/** The delimiters offered in the manual override, in the order papaparse guesses. */
export const DELIMITERS: Array<{ value: string; label: string }> = [
  { value: ',', label: 'Comma' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon' },
  { value: '|', label: 'Pipe' },
]

export function delimiterLabel(value: string): string {
  return DELIMITERS.find((d) => d.value === value)?.label ?? 'Comma'
}

export interface ParsedCsv {
  /** The first row, verbatim. Blank headers become `column_3` so the mapper can name them. */
  headers: string[]
  /** Every subsequent row, positionally. Never padded — see the note above. */
  rows: string[][]
  delimiter: string
  /** Where the file came from, for the step-1 summary. */
  source: string
  /** True when the file carried a UTF-8 byte-order mark, which we stripped. */
  hadBom: boolean
}

export class CsvError extends Error {}

/* ------------------------------------------------------------------ reading */

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot).toLowerCase()
}

/**
 * Reads a File to text, enforcing the size cap BEFORE the read so a 400MB drop is
 * refused instantly rather than after the browser has copied it into memory.
 */
export async function readFile(file: File): Promise<string> {
  const extension = extensionOf(file.name)
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new CsvError(
      `${file.name} is a ${extension || 'extensionless'} file. Upload a .csv, .tsv or .txt.`,
    )
  }
  if (file.size > MAX_BYTES) {
    throw new CsvError(
      `${file.name} is ${formatBytes(file.size)}. The limit is 5MB — split it and import the halves.`,
    )
  }
  if (file.size === 0) throw new CsvError(`${file.name} is empty.`)
  return file.text()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/** UTF-8 BOM. Left in place it becomes part of the first header and breaks auto-match. */
const BOM = '﻿'

export function stripBom(text: string): { text: string; hadBom: boolean } {
  return text.startsWith(BOM) ? { text: text.slice(1), hadBom: true } : { text, hadBom: false }
}

/* ------------------------------------------------------------------ parsing */

/**
 * Counts candidate delimiters on the first few lines so the manual override opens
 * on the right value even before a parse has run. papaparse does its own detection
 * during the parse and reports it in `meta.delimiter`; this is only the initial
 * guess shown in the Select.
 */
export function guessDelimiter(text: string): string {
  const sample = text
    .split(/\r\n|\r|\n/)
    .slice(0, 10)
    .join('\n')
  let best = ','
  let bestScore = -1

  for (const { value } of DELIMITERS) {
    // Count occurrences outside quotes, cheaply: a quoted comma is rare enough in
    // the first ten lines that a naive count still picks the right character.
    const count = sample.split(value).length - 1
    if (count > bestScore) {
      bestScore = count
      best = value
    }
  }

  return bestScore <= 0 ? ',' : best
}

export interface ParseOptions {
  /** Omit to let papaparse detect it. */
  delimiter?: string
  source: string
}

/**
 * The one parse entry point. Resolves with a `ParsedCsv`, or rejects with a
 * `CsvError` carrying a sentence the operator can act on.
 */
export function parseCsv(rawText: string, options: ParseOptions): Promise<ParsedCsv> {
  const { text, hadBom } = stripBom(rawText)

  if (!text.trim()) return Promise.reject(new CsvError('That file has no rows in it.'))

  return new Promise<ParsedCsv>((resolve, reject) => {
    Papa.parse<string[]>(text, {
      // THE non-negotiable. Everything below must survive a structured clone.
      worker: true,
      header: false,
      skipEmptyLines: 'greedy',
      // '' means "detect". papaparse reports what it chose in meta.delimiter.
      delimiter: options.delimiter ?? '',
      // One over the cap, so a file at the limit parses and a file past it can be
      // named as "more than 5000" without reading all of it.
      preview: MAX_ROWS + 2,
      complete: (results) => {
        const table = results.data.filter((row) => row.length > 0)
        if (table.length === 0) return reject(new CsvError('That file has no rows in it.'))

        const [headerRow, ...rows] = table as string[][]

        if (rows.length === 0) {
          reject(
            new CsvError(
              'That file has a header row and nothing under it. Add at least one account.',
            ),
          )
          return
        }

        if (rows.length > MAX_ROWS) {
          reject(
            new CsvError(
              `That file has more than ${MAX_ROWS.toLocaleString()} rows. Split it and import the parts.`,
            ),
          )
          return
        }

        const headers = normaliseHeaders(headerRow ?? [])

        // A single column across every row almost always means the delimiter is
        // wrong — a .txt of newline-separated junk, or a semicolon file read as CSV.
        if (headers.length < 2) {
          reject(
            new CsvError(
              'Only one column was found. Check the delimiter, or start from the template.',
            ),
          )
          return
        }

        resolve({
          headers,
          rows,
          delimiter: results.meta.delimiter || options.delimiter || ',',
          source: options.source,
          hadBom,
        })
      },
      error: (error: Error) => reject(new CsvError(error.message)),
    })
  })
}

/**
 * Blank and duplicate headers get positional names. Without this the mapper renders
 * two rows labelled the same thing and the operator cannot tell which is which.
 */
function normaliseHeaders(row: string[]): string[] {
  const seen = new Map<string, number>()

  return row.map((value, index) => {
    const trimmed = value.trim()
    const base = trimmed || `column_${index + 1}`
    const count = seen.get(base.toLowerCase()) ?? 0
    seen.set(base.toLowerCase(), count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })
}
