'use client'

import * as React from 'react'
import { AlertTriangle, ClipboardPaste, Download, FileUp, Loader2, Upload } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Prose, SectionLabel } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Chip } from '@/components/domain/StatusChip'
import { FIELDS, templateCsv } from './fields'
import {
  ACCEPTED_EXTENSIONS,
  CsvError,
  DELIMITERS,
  MAX_ROWS,
  formatBytes,
  guessDelimiter,
  parseCsv,
  readFile,
  stripBom,
  type ParsedCsv,
} from './parse'

/**
 * Step 1 (§8.3). Three ways in, because operators arrive with three different things:
 * a file on disk (drop or browse) and, just as often, a block of rows already on the
 * clipboard out of Excel or a WhatsApp message. Refusing the third would send someone
 * off to save a file first, and that is where an import gets abandoned.
 *
 * The raw text is kept in state after the first read so the delimiter override
 * re-parses instantly instead of asking for the file again.
 */

const PASTE_SOURCE = 'Pasted rows'

export function CsvDropzone({
  onParsed,
  className,
}: {
  onParsed: (parsed: ParsedCsv, rawText: string) => void
  className?: string
}) {
  const [dragging, setDragging] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pasting, setPasting] = React.useState(false)
  const [pasted, setPasted] = React.useState('')

  /** The last thing read, so the delimiter override does not need it again. */
  const [text, setText] = React.useState<string | null>(null)
  const [source, setSource] = React.useState('')
  const [delimiter, setDelimiter] = React.useState<string | null>(null)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropRef = React.useRef<HTMLDivElement>(null)

  const run = React.useCallback(
    async (rawText: string, nextSource: string, override: string | null) => {
      setBusy(true)
      setError(null)
      try {
        const chosen = override ?? guessDelimiter(stripBom(rawText).text)
        const parsed = await parseCsv(rawText, { delimiter: chosen, source: nextSource })
        setText(rawText)
        setSource(nextSource)
        setDelimiter(parsed.delimiter)
        onParsed(parsed, rawText)
      } catch (cause) {
        setError(
          cause instanceof CsvError
            ? cause.message
            : 'That file could not be read. Try re-saving it as CSV.',
        )
      } finally {
        setBusy(false)
      }
    },
    [onParsed],
  )

  const takeFile = React.useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const contents = await readFile(file)
        await run(contents, file.name, null)
      } catch (cause) {
        setError(
          cause instanceof CsvError ? cause.message : `${file.name} could not be read from disk.`,
        )
        setBusy(false)
      }
    },
    [run],
  )

  /* --------------------------------------------------------------- paste */

  // A paste anywhere on this step counts — an operator who has just copied 200 rows
  // presses Ctrl+V at the screen, not at a particular box.
  React.useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null
      // Never steal a paste aimed at a real field.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      const contents = event.clipboardData?.getData('text/plain') ?? ''
      if (!contents.trim() || !contents.includes('\n')) return
      event.preventDefault()
      void run(contents, PASTE_SOURCE, null)
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [run])

  async function pasteFromClipboard() {
    try {
      const contents = await navigator.clipboard.readText()
      if (!contents.trim()) {
        setError('The clipboard is empty.')
        return
      }
      await run(contents, PASTE_SOURCE, null)
    } catch {
      // Firefox and Safari refuse readText() without a user gesture they trust.
      setPasting(true)
      setError(null)
    }
  }

  /* ------------------------------------------------------------ template */

  function downloadTemplate() {
    // The BOM is what stops Excel showing an accented name as mojibake.
    const blob = new Blob(['﻿', templateCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fetch-io-accounts-template.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div
        ref={dropRef}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!dropRef.current?.contains(event.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) void takeFile(file)
        }}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-150',
          dragging ? 'border-primary bg-primary/8' : 'border-border-strong bg-surface-raised',
        )}
      >
        <span
          className={cn(
            'flex size-12 items-center justify-center rounded-md',
            dragging ? 'bg-primary text-white' : 'bg-fetch-gradient text-white',
          )}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="space-y-1">
          <p className="font-mono text-title font-semibold text-text uppercase">
            {busy ? 'Reading your file' : 'Drop a CSV here'}
          </p>
          <Prose className="text-muted">
            Or browse for one, or just paste rows straight from your spreadsheet.{' '}
            {ACCEPTED_EXTENSIONS.join(', ')} up to 5MB and {MAX_ROWS.toLocaleString()} rows. UTF-8;
            a byte-order mark is fine.
          </Prose>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            label="Browse files"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            label="Paste rows"
            disabled={busy}
            onClick={() => void pasteFromClipboard()}
          >
            <ClipboardPaste className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void takeFile(file)
            // Reset so choosing the same file twice fires a change event again.
            event.target.value = ''
          }}
        />
      </div>

      {pasting && (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          <SectionLabel>paste_rows</SectionLabel>
          <Prose className="text-muted">
            Your browser would not hand over the clipboard on its own. Paste into the box and the
            rows are read the moment you do.
          </Prose>
          <textarea
            autoFocus
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            onPaste={(event) => {
              const contents = event.clipboardData.getData('text/plain')
              if (contents.trim()) {
                event.preventDefault()
                setPasted(contents)
                void run(contents, PASTE_SOURCE, null)
                setPasting(false)
              }
            }}
            rows={5}
            placeholder="email,password,club&#10;a.hughes@mail.com,…,Arsenal"
            className="csv-preview w-full rounded-md border border-border bg-surface-raised p-3 font-mono text-body text-text placeholder:text-faint"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              label="Read these rows"
              disabled={!pasted.trim()}
              onClick={() => void run(pasted, PASTE_SOURCE, null)}
            />
            <Button
              type="button"
              variant="ghost"
              label="Cancel"
              onClick={() => {
                setPasting(false)
                setPasted('')
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/12 p-4"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger-ink" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-mono text-btn font-semibold tracking-[0.06em] text-danger-ink uppercase">
              That file was not read
            </p>
            <Prose className="mt-1 text-muted">{error}</Prose>
          </div>
        </div>
      )}

      {/* --- delimiter + template ------------------------------------- */}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>delimiter</SectionLabel>
          <div className="flex items-center gap-2">
            <Select
              value={delimiter ?? ','}
              disabled={!text || busy}
              onValueChange={(next) => {
                if (text) void run(text, source, next)
              }}
            >
              <SelectTrigger
                aria-label="Delimiter"
                className="h-9 w-[170px] border-border bg-surface text-body"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                {DELIMITERS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-body">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {text && (
              <Chip tone="primary">
                {source === PASTE_SOURCE ? 'from clipboard' : formatBytes(new Blob([text]).size)}
              </Chip>
            )}
            {!text && <span className="text-caption text-faint">detected on upload</span>}
          </div>
        </div>

        {/* §8.3 calls this prominent, and it is: an operator who has never seen the
            shape of the file we want should not have to guess it from a table. */}
        <Button
          type="button"
          variant="gradient"
          label="Download CSV template"
          onClick={downloadTemplate}
        >
          <Download className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <ExpectedColumns />
    </div>
  )
}

/** §8.3's "what we expect" table: 3 required, 12 optional, with what each one means. */
function ExpectedColumns() {
  const required = FIELDS.filter((field) => field.required)
  const optional = FIELDS.filter((field) => !field.required)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-raised px-4 py-2.5">
        <SectionLabel>what_we_expect</SectionLabel>
        <span className="text-caption text-faint">
          {required.length} required · {optional.length} optional
        </span>
      </div>

      <table className="w-full">
        <caption className="sr-only">
          The columns Fetch.io reads from an account import, and what each one means.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th
              scope="col"
              className="w-[190px] px-4 py-2 text-left font-mono text-label text-muted"
            >
              COLUMN
            </th>
            <th scope="col" className="w-[110px] px-4 py-2 text-left font-mono text-label text-muted">
              NEEDED
            </th>
            <th scope="col" className="px-4 py-2 text-left font-mono text-label text-muted">
              WHAT IT IS
            </th>
          </tr>
        </thead>
        <tbody>
          {[...required, ...optional].map((field) => (
            <tr key={field.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2 align-top">
                <span className="font-mono text-body text-text">{field.header}</span>
              </td>
              <td className="px-4 py-2 align-top">
                {field.required ? (
                  <Chip tone="danger">REQUIRED</Chip>
                ) : (
                  <Chip tone="neutral">OPTIONAL</Chip>
                )}
              </td>
              <td className="px-4 py-2 align-top">
                <Prose className="text-muted">{field.hint}</Prose>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
