'use client'

import * as React from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { Prose, SectionLabel } from '@/components/ui/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePasteAccounts } from '@/lib/api/hooks/useBallots'
import { BALLOT_CLUB_IDS, type BallotClubId } from '@/lib/types'

/**
 * §B5.1 — the quick loader.
 *
 * One `email:password` per line, with `,` and `;` accepted because a spreadsheet
 * export uses whichever the operator's locale picked.
 *
 * PASSWORDS (§B7 rule 2). The block lives in one piece of React state and nowhere
 * else: no draft in `localStorage`, no query cache entry, nothing in the URL, nothing
 * logged. It is sent once and the field is cleared the moment the server answers. The
 * preview under the field shows the email verbatim and the password as ten bullets —
 * constant width, so the column does not publish how long anyone's password is.
 */

const SEPARATORS = /[:,;]/
const MASK = '•'.repeat(10)
const PREVIEW_ROWS = 4

interface ParsedLine {
  row: number
  email: string
  valid: boolean
}

interface Parsed {
  lines: ParsedLine[]
  valid: ParsedLine[]
  /** Emails repeated inside the pasted block itself. */
  duplicates: number
  /** Emails that already have an account in Fetch.io. */
  known: number
  malformed: number
}

function parse(text: string, knownEmails: Set<string>): Parsed {
  const lines: ParsedLine[] = []
  const seen = new Set<string>()
  let duplicates = 0
  let known = 0
  let malformed = 0

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line) return

    const at = line.search(SEPARATORS)
    const email = at === -1 ? '' : line.slice(0, at).trim().toLowerCase()
    const password = at === -1 ? '' : line.slice(at + 1).trim()
    const wellFormed = Boolean(email && password && email.includes('@') && email.length >= 5)

    if (!wellFormed) {
      malformed++
      lines.push({ row: index + 1, email: line.slice(0, 40), valid: false })
      return
    }

    if (seen.has(email)) duplicates++
    else {
      seen.add(email)
      if (knownEmails.has(email)) known++
    }

    lines.push({ row: index + 1, email, valid: true })
  })

  return { lines, valid: lines.filter((l) => l.valid), duplicates, known, malformed }
}

export function PasteLoader({
  knownEmails,
  onImportCsv,
}: {
  /** Lowercased emails already in the pool, for the "already known" counter. */
  knownEmails: Set<string>
  onImportCsv: (club: BallotClubId) => void
}) {
  const [club, setClub] = React.useState<BallotClubId | ''>('')
  const [text, setText] = React.useState('')
  const paste = usePasteAccounts()

  const parsed = React.useMemo(() => parse(text, knownEmails), [text, knownEmails])
  const fieldId = React.useId()

  // The count is unique valid emails, which is what will actually be created —
  // a button reading LOAD_ACCOUNTS (124) that creates 121 is a button that lied.
  const loadable = parsed.valid.length - parsed.duplicates

  const submit = () => {
    if (!club || loadable <= 0) return

    paste.mutate(
      { club, text },
      {
        onSuccess: (result) => {
          // Cleared here rather than optimistically: the block is gone the instant
          // the server has it, and not one render before (§B7 rule 2).
          setText('')

          const parts = [`${result.created} added`]
          if (result.updated) parts.push(`${result.updated} updated`)
          if (result.skipped) parts.push(`${result.skipped} repeated in the paste`)
          const failed = result.errors.filter((e) => e.row > 0 && !e.email).length
          if (failed) parts.push(`${failed} could not be read`)

          toast.success(parts.join(' · '), {
            description: result.errors.length
              ? result.errors
                  .slice(0, 3)
                  .map((e) => `Line ${e.row}: ${e.message}`)
                  .join(' ')
              : undefined,
          })
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <section
      data-tour="pool-paste"
      className="rounded-lg border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>quick_load</SectionLabel>
        <Button
          variant="ghost"
          size="sm"
          label="Import CSV"
          forward
          onClick={() => onImportCsv((club || 'arsenal') as BallotClubId)}
        >
          <Upload aria-hidden="true" />
        </Button>
      </div>

      <Prose className="mt-2 max-w-prose text-muted">
        One account per line, as <span className="font-mono text-text">email:password</span>. A
        comma or a semicolon works too. Passwords are sent once and never stored in this browser.
      </Prose>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <label htmlFor={fieldId} className="sr-only">
            Accounts to load
          </label>
          <textarea
            id={fieldId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            spellCheck={false}
            autoComplete="off"
            // Off for the same reason a password field is: the browser must not
            // offer to remember what is in here.
            data-1p-ignore="true"
            placeholder={'j.moreau@mail.com:••••••••\nk.silva@mail.com:••••••••'}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-body text-text placeholder:text-faint focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />

          <p className="mt-2 font-mono text-caption text-muted" aria-live="polite">
            {parsed.lines.length === 0 ? (
              <span className="text-faint">{'// no lines yet'}</span>
            ) : (
              <>
                {`// ${parsed.lines.length} ${parsed.lines.length === 1 ? 'line' : 'lines'}`}
                {parsed.duplicates > 0 &&
                  ` · ${parsed.duplicates} duplicate${parsed.duplicates === 1 ? '' : 's'} in the paste`}
                {parsed.known > 0 && ` · ${parsed.known} already known`}
                {parsed.malformed > 0 &&
                  ` · ${parsed.malformed} unreadable line${parsed.malformed === 1 ? '' : 's'}`}
              </>
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <SectionLabel className="mb-1.5">club</SectionLabel>
            <Select value={club} onValueChange={(value) => setClub(value as BallotClubId)}>
              <SelectTrigger
                aria-label="Club these accounts belong to"
                className="h-9 w-full border-border bg-surface text-body"
              >
                <SelectValue placeholder="Choose a club" />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                {BALLOT_CLUB_IDS.map((id) => (
                  <SelectItem key={id} value={id} className="text-body">
                    {/* Club names are domain data — verbatim (§B7 rule 7). */}
                    <ClubBadge club={id} variant="full" size="sm" />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parsed.valid.length > 0 && (
            <div className="min-w-0 rounded-md border border-border bg-background p-2.5">
              <SectionLabel className="mb-1.5">preview</SectionLabel>
              <ul className="space-y-1 font-mono text-caption">
                {parsed.valid.slice(0, PREVIEW_ROWS).map((line) => (
                  <li key={line.row} className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-text">{line.email}</span>
                    <span className="text-faint">:</span>
                    <span className="shrink-0 text-faint">{MASK}</span>
                  </li>
                ))}
              </ul>
              {parsed.valid.length > PREVIEW_ROWS && (
                <p className="mt-1.5 font-mono text-caption text-faint">
                  {`// +${parsed.valid.length - PREVIEW_ROWS} more`}
                </p>
              )}
            </div>
          )}

          <Button
            className="mt-auto w-full"
            label="Load accounts"
            count={Math.max(0, loadable)}
            forward
            disabled={!club || loadable <= 0 || paste.isPending}
            onClick={submit}
          />
          {!club && parsed.valid.length > 0 && (
            <Prose className="text-caption text-muted">
              Choose the club these accounts belong to first.
            </Prose>
          )}
        </div>
      </div>
    </section>
  )
}
