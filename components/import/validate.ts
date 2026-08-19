import { membershipTypeSchema } from '@/lib/api/schemas'
import type { MembershipType, Proxy } from '@/lib/types'
import { isAutoFixable, resolveClub, type ClubMatch } from './club-match'
import { IGNORE, type FieldId, type RowValues } from './fields'
import type { Mapping } from './automap'

/**
 * Every validation rule in the §8.3 table, in one pure module.
 *
 * Pure on purpose: step 3 re-runs the whole file through `validateRows` on every
 * inline edit so the three counters are live, and a function with no React in it and
 * no I/O is the only version of that which is cheap enough to do 5000 rows at a
 * keystroke. It also means the rules can be reasoned about — and, later, tested —
 * without mounting a table.
 *
 * The one thing the client genuinely cannot answer is "does this email already have
 * an account?". `POST /accounts/import/validate` answers it once, and its verdict
 * arrives here as `existingEmails` so the rule stays live while the operator edits.
 */

export const ROW_FIELD = '_row' as const
export type IssueField = FieldId | typeof ROW_FIELD

export type IssueLevel = 'error' | 'warning'
export type RowLevel = 'ready' | 'warning' | 'error'

export interface Issue {
  field: IssueField
  level: IssueLevel
  /** A plain sentence. It is the tooltip on the tinted cell — never snake_case. */
  message: string
  /** A one-click correction: sets this cell to `value`. */
  fix?: { label: string; value: string }
  /** True when "Fix all clubs automatically" may apply `fix` unattended. */
  autoFixable?: boolean
}

export interface RowVerdict {
  /** 0-based index into the parsed data rows. Row 1 in the file is index 0. */
  index: number
  level: RowLevel
  /** Taken out of this import by the operator. Not counted, not sent. */
  excluded: boolean
  issues: Issue[]
  /** The worst issue per field, for tinting the cell. */
  byField: Partial<Record<IssueField, Issue>>
  /** Set when this email already has an account — drives Skip / Update existing. */
  duplicateOf?: string
}

export interface Counts {
  ready: number
  warning: number
  error: number
  /** Rows whose club could be fixed by the bulk action, for its label. */
  autoFixableClubs: number
  /** Rows that would update rather than create. */
  duplicates: number
  /** Rows the operator has taken out of this import. Counted in none of the above. */
  excluded: number
}

export interface ValidationContext {
  /** Lowercased email → the existing account's email, as the server spelled it. */
  existingEmails: Map<string, string>
  /** For resolving a `host:port:...` string onto an account's `proxyId`. */
  proxies: Proxy[]
  /** Header count, so a ragged row can be named. */
  headerCount: number
  /** Row indices the operator has excluded. They are still validated, so restoring
      one shows its real state — but they count towards nothing and are not sent. */
  excluded: ReadonlySet<number>
}

const MEMBERSHIP_TYPES = new Set<string>(membershipTypeSchema.options)

/**
 * Deliberately the same expression the mock API validates with. A stricter client
 * rule would reject rows the server would have accepted, which reads as a bug in the
 * wizard rather than a rule.
 */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/* ------------------------------------------------------------ row assembly */

export interface ImportRow {
  index: number
  /** Mapped and edited. Trimmed, because a trailing space in a club name is not a club. */
  values: RowValues
  /** Positional cells, verbatim — what the error report writes back out. */
  raw: string[]
}

export type Edits = Record<number, RowValues>

/** Turns positional CSV rows into keyed rows, applying the operator's inline edits. */
export function buildRows(rows: string[][], mapping: Mapping, edits: Edits): ImportRow[] {
  const columns = mapping.filter((entry) => entry.field !== IGNORE)

  return rows.map((raw, index) => {
    const values: RowValues = {}
    for (const column of columns) {
      if (column.field === IGNORE) continue
      values[column.field] = (raw[column.index] ?? '').trim()
    }
    const edit = edits[index]
    if (edit) {
      for (const [field, value] of Object.entries(edit)) {
        values[field as FieldId] = value.trim()
      }
    }
    return { index, values, raw }
  })
}

/* ------------------------------------------------------------------- rules */

function push(verdict: RowVerdict, issue: Issue) {
  verdict.issues.push(issue)
  const existing = verdict.byField[issue.field]
  // An error on a cell outranks a warning on the same cell for the tint.
  if (!existing || (existing.level === 'warning' && issue.level === 'error')) {
    verdict.byField[issue.field] = issue
  }
  if (issue.level === 'error') verdict.level = 'error'
  else if (verdict.level === 'ready') verdict.level = 'warning'
}

/** Parses `host:port:user:pass`. Returns null when it is not that shape. */
export function parseProxy(value: string): { host: string; port: number } | null {
  const parts = value.split(':')
  if (parts.length !== 4) return null
  const [host, port, user, pass] = parts
  if (!host || !user || !pass) return null
  const portNumber = Number(port)
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) return null
  return { host, port: portNumber }
}

export function matchProxy(value: string, proxies: Proxy[]): Proxy | undefined {
  const parsed = parseProxy(value)
  if (!parsed) return undefined
  return proxies.find((p) => p.host === parsed.host && p.port === parsed.port)
}

/**
 * One row. `seen` carries the emails already met in THIS file, so the second
 * occurrence is the error and the first stays clean (§8.3).
 */
function validateRow(
  row: ImportRow,
  context: ValidationContext,
  seen: Map<string, number>,
): { verdict: RowVerdict; clubMatch: ClubMatch | null } {
  const verdict: RowVerdict = {
    index: row.index,
    level: 'ready',
    excluded: context.excluded.has(row.index),
    issues: [],
    byField: {},
  }
  const values = row.values

  /* --- shape ---------------------------------------------------------- */

  if (row.raw.length !== context.headerCount) {
    const shorter = row.raw.length < context.headerCount
    push(verdict, {
      field: ROW_FIELD,
      level: 'warning',
      message: shorter
        ? `This row has ${row.raw.length} cells where the header has ${context.headerCount}. The missing cells are treated as empty.`
        : `This row has ${row.raw.length} cells where the header has ${context.headerCount}. The extra cells are ignored.`,
    })
  }

  /* --- email ---------------------------------------------------------- */

  const email = values.email ?? ''
  if (!email) {
    push(verdict, { field: 'email', level: 'error', message: 'The email is missing.' })
  } else if (!EMAIL.test(email)) {
    push(verdict, {
      field: 'email',
      level: 'error',
      message: `'${email}' is not a valid email address.`,
    })
  } else {
    const key = email.toLowerCase()
    const firstAt = seen.get(key)
    if (firstAt !== undefined) {
      push(verdict, {
        field: 'email',
        level: 'error',
        message: `This email is already on row ${firstAt + 1} of this file. Remove one of the two.`,
      })
    } else {
      seen.set(key, row.index)
      const existing = context.existingEmails.get(key)
      if (existing) {
        verdict.duplicateOf = existing
        push(verdict, {
          field: 'email',
          level: 'warning',
          message: `${existing} already has an account. It will be skipped or updated, depending on the choice above.`,
        })
      }
    }
  }

  /* --- password ------------------------------------------------------- */

  if (!values.password) {
    push(verdict, { field: 'password', level: 'error', message: 'The password is missing.' })
  }

  /* --- club ----------------------------------------------------------- */

  const clubValue = values.club ?? ''
  let clubMatch: ClubMatch | null = null

  if (!clubValue) {
    push(verdict, { field: 'club', level: 'error', message: 'The club is missing.' })
  } else {
    clubMatch = resolveClub(clubValue)
    if (clubMatch.status === 'suggestion') {
      push(verdict, {
        field: 'club',
        level: 'error',
        message: `'${clubValue}' is not one of the twenty clubs. Did you mean ${clubMatch.club.name}?`,
        fix: { label: clubMatch.club.name, value: clubMatch.club.name },
        autoFixable: isAutoFixable(clubMatch),
      })
    } else if (clubMatch.status === 'none') {
      push(verdict, {
        field: 'club',
        level: 'error',
        message: `'${clubValue}' is not one of the twenty Premier League clubs. Pick the right one.`,
      })
    }
  }

  /* --- membership type ------------------------------------------------ */

  const membershipType = values.membership_type ?? ''
  if (membershipType && !MEMBERSHIP_TYPES.has(membershipType)) {
    push(verdict, {
      field: 'membership_type',
      level: 'warning',
      message: `'${membershipType}' is not a membership type. This account will be imported as official-member.`,
      fix: { label: 'official-member', value: 'official-member' },
    })
  }

  /* --- loyalty points ------------------------------------------------- */

  const loyalty = values.loyalty_points ?? ''
  if (loyalty && !/^\d+$/.test(loyalty)) {
    push(verdict, {
      field: 'loyalty_points',
      level: 'warning',
      message: `'${loyalty}' is not a whole number. The loyalty points will be dropped rather than guessed.`,
    })
  }

  /* --- proxy ---------------------------------------------------------- */

  const proxy = values.proxy ?? ''
  if (proxy) {
    if (!parseProxy(proxy)) {
      push(verdict, {
        field: 'proxy',
        level: 'warning',
        message: 'A proxy has to read host:port:user:pass. This one will be dropped.',
      })
    } else if (!matchProxy(proxy, context.proxies)) {
      push(verdict, {
        field: 'proxy',
        level: 'warning',
        message:
          'No proxy in your list is on that host and port. Add it under Accounts › Proxies first, or this account imports without one.',
      })
    }
  }

  return { verdict, clubMatch }
}

export interface ValidationResult {
  verdicts: RowVerdict[]
  counts: Counts
}

export function validateRows(rows: ImportRow[], context: ValidationContext): ValidationResult {
  const seen = new Map<string, number>()
  const verdicts: RowVerdict[] = []
  const counts: Counts = {
    ready: 0,
    warning: 0,
    error: 0,
    autoFixableClubs: 0,
    duplicates: 0,
    excluded: 0,
  }

  for (const row of rows) {
    const { verdict } = validateRow(row, context, seen)
    verdicts.push(verdict)

    // An excluded row is not going anywhere, so it is not a problem to solve and it
    // must not hold the Import button hostage. It still carries its verdict, so
    // restoring it puts the true state straight back on the counters.
    if (verdict.excluded) {
      counts.excluded++
      continue
    }

    if (verdict.level === 'error') counts.error++
    else if (verdict.level === 'warning') counts.warning++
    else counts.ready++

    if (verdict.byField.club?.autoFixable) counts.autoFixableClubs++
    if (verdict.duplicateOf) counts.duplicates++
  }

  return { verdicts, counts }
}

/* ----------------------------------------------------------- bulk club fix */

/** Every club cell a high-confidence suggestion can correct, as an edit patch. */
export function autoClubFixes(verdicts: RowVerdict[]): Edits {
  const edits: Edits = {}
  for (const verdict of verdicts) {
    if (verdict.excluded) continue
    const issue = verdict.byField.club
    if (issue?.autoFixable && issue.fix) edits[verdict.index] = { club: issue.fix.value }
  }
  return edits
}

/** The first thing wrong with a row, in one sentence — the `_error` column's text. */
export function firstProblem(verdict: RowVerdict): string {
  const worst = verdict.issues.find((issue) => issue.level === 'error') ?? verdict.issues[0]
  return worst?.message ?? 'This row was left out of the import.'
}

export function mergeEdits(current: Edits, patch: Edits): Edits {
  const next: Edits = { ...current }
  for (const [index, values] of Object.entries(patch)) {
    next[Number(index)] = { ...next[Number(index)], ...values }
  }
  return next
}

/* ---------------------------------------------------------- commit payload */

/**
 * The `POST /accounts/bulk` body for one row.
 *
 * Anything the §8.3 table says is "dropped" is dropped HERE, not sent and hoped for:
 * `accountCreateSchema.partial()` would reject an unparseable `loyaltyPoints` or an
 * unknown `membershipType` and fail the ENTIRE request, so a single junk cell would
 * take 499 good rows down with it.
 *
 * `imap_email` / `imap_password` are collected by the template but deliberately not
 * sent: `POST /accounts/bulk` has nowhere to put them, and posting a mailbox password
 * to an endpoint that discards it is the one thing worse than not supporting it yet.
 */
export interface BulkRow {
  email: string
  password: string
  club?: string
  membershipId?: string
  membershipType?: MembershipType
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: string
  loyaltyPoints?: number
  proxyId?: string
  tags?: string[]
  notes?: string
}

export function toBulkRow(row: ImportRow, proxies: Proxy[]): BulkRow {
  const values = row.values
  const email = values.email ?? ''
  const password = values.password ?? ''
  const club = resolveClub(values.club ?? '')

  const membershipType = values.membership_type ?? ''
  const loyalty = values.loyalty_points ?? ''
  const proxy = values.proxy ? matchProxy(values.proxy, proxies) : undefined
  const tags = (values.tags ?? '')
    .split(/[|;]/)
    .map((tag) => tag.trim())
    .filter(Boolean)

  return {
    email,
    password,
    // Omitted rather than sent raw when it does not resolve. A row is NEVER dropped
    // here: `POST /accounts/bulk` reports one error per row, and the step-4 summary
    // maps those row numbers straight back onto this array — silently skipping a row
    // would shift every number after it onto the wrong line of the operator's file.
    club: club.status === 'exact' ? club.club.id : undefined,
    membershipId: values.membership_id || undefined,
    membershipType: MEMBERSHIP_TYPES.has(membershipType)
      ? (membershipType as MembershipType)
      : undefined,
    firstName: values.first_name || undefined,
    lastName: values.last_name || undefined,
    phone: values.phone || undefined,
    dateOfBirth: values.date_of_birth || undefined,
    loyaltyPoints: /^\d+$/.test(loyalty) ? Number(loyalty) : undefined,
    proxyId: proxy?.id,
    tags: tags.length ? tags : undefined,
    notes: values.notes || undefined,
  }
}

/**
 * The dry-run body for `POST /accounts/import/validate`, which reads the template's
 * snake_case column names. The club is sent RESOLVED — the server only knows the
 * twenty ids, so sending "Man Utd" would have it report an error the wizard has
 * already offered a fix for, and the operator would see the same complaint twice.
 *
 * `password` is sent as a presence marker, never the secret: the endpoint's only
 * password rule is "is it missing", and this dry run is a diagnostic, not a write.
 */
export function toValidateRow(row: ImportRow): Record<string, string | null> {
  const values = row.values
  const club = resolveClub(values.club ?? '')

  return {
    email: values.email ?? '',
    password: values.password ? 'x' : '',
    club: club.status === 'exact' ? club.club.id : (values.club ?? ''),
    membership_type: values.membership_type ?? '',
    loyalty_points: values.loyalty_points ?? '',
    proxy: values.proxy ?? '',
  }
}
