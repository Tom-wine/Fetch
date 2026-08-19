/**
 * The import vocabulary (§8.3): the fifteen columns of the CSV template, and the
 * one place that says which of them Fetch.io actually requires.
 *
 * Everything downstream — the template file, the "what we expect" table, the column
 * mapper's Select, the validator, the preview's column order and the error report —
 * reads this array. A field cannot exist in the template and not in the mapper.
 */

export type FieldId =
  | 'email'
  | 'password'
  | 'club'
  | 'membership_type'
  | 'membership_id'
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'date_of_birth'
  | 'loyalty_points'
  | 'proxy'
  | 'imap_email'
  | 'imap_password'
  | 'tags'
  | 'notes'

/** A CSV column the operator has chosen not to import. */
export const IGNORE = '__ignore__' as const
export type Mapped = FieldId | typeof IGNORE

export interface FieldSpec {
  id: FieldId
  /** The header written to the template, and what the mapper matches against. */
  header: string
  /** Human label in the mapper's Select. Chrome string. */
  label: string
  required: boolean
  /** One line, shown in the "what we expect" table. Plain sentence. */
  hint: string
  /** Treated as a secret: masked in every preview cell, never persisted. */
  secret?: boolean
  /** Extra strings a header may use for this field, beyond the header itself. */
  aliases: string[]
}

export const FIELDS: FieldSpec[] = [
  {
    id: 'email',
    header: 'email',
    label: 'Email',
    required: true,
    hint: 'The address the account signs in with. It is also the identity we de-duplicate on.',
    aliases: ['e-mail', 'email address', 'login', 'username', 'user', 'account', 'mail'],
  },
  {
    id: 'password',
    header: 'password',
    label: 'Password',
    required: true,
    secret: true,
    hint: 'The club-site password. Held only in this tab; never written to storage.',
    aliases: ['pass', 'pwd', 'passwd', 'secret', 'login password'],
  },
  {
    id: 'club',
    header: 'club',
    label: 'Club',
    required: true,
    hint: 'One of the twenty Premier League clubs. Common short forms are matched for you.',
    aliases: ['team', 'club name', 'membership club', 'site'],
  },
  {
    id: 'membership_type',
    header: 'membership_type',
    label: 'Membership type',
    required: false,
    hint: 'season-ticket, official-member, digital-member, international-member, ticket-exchange, general-sale or hospitality.',
    aliases: ['membership', 'type', 'member type', 'tier', 'plan'],
  },
  {
    id: 'membership_id',
    header: 'membership_id',
    label: 'Client reference',
    required: false,
    hint: 'The supporter or client number the club knows this account by.',
    aliases: [
      'membership id',
      'client reference',
      'client ref',
      'ref',
      'reference',
      'supporter number',
      'member id',
      'membership number',
    ],
  },
  {
    id: 'first_name',
    header: 'first_name',
    label: 'First name',
    required: false,
    hint: 'Shown on the account row and used on any club form we fill in for you.',
    aliases: ['firstname', 'first', 'given name', 'forename'],
  },
  {
    id: 'last_name',
    header: 'last_name',
    label: 'Last name',
    required: false,
    hint: 'Shown on the account row and used on any club form we fill in for you.',
    aliases: ['lastname', 'last', 'surname', 'family name'],
  },
  {
    id: 'phone',
    header: 'phone',
    label: 'Phone',
    required: false,
    hint: 'Any format. Some clubs send their two-factor code here.',
    aliases: ['telephone', 'mobile', 'phone number', 'tel', 'msisdn'],
  },
  {
    id: 'date_of_birth',
    header: 'date_of_birth',
    label: 'Date of birth',
    required: false,
    hint: 'Some clubs ask for it at checkout. Any readable format.',
    aliases: ['dob', 'birth date', 'birthday', 'date of birth'],
  },
  {
    id: 'loyalty_points',
    header: 'loyalty_points',
    label: 'Loyalty points',
    required: false,
    hint: 'A whole number. Anything else is dropped rather than guessed.',
    aliases: ['loyalty', 'points', 'credits', 'loyalty pts'],
  },
  {
    id: 'proxy',
    header: 'proxy',
    label: 'Proxy',
    required: false,
    hint: 'host:port:user:pass. Matched against the proxies you already have.',
    aliases: ['proxy string', 'proxy address', 'ip'],
  },
  {
    id: 'imap_email',
    header: 'imap_email',
    label: 'IMAP email',
    required: false,
    hint: 'The mailbox we read one-time codes from.',
    aliases: ['imap', 'imap address', 'inbox', 'otp email', 'mail account'],
  },
  {
    id: 'imap_password',
    header: 'imap_password',
    label: 'IMAP password',
    required: false,
    secret: true,
    hint: 'The mailbox or app password. Held only in this tab; never written to storage.',
    aliases: ['imap pass', 'imap pwd', 'mail password', 'inbox password'],
  },
  {
    id: 'tags',
    header: 'tags',
    label: 'Tags',
    required: false,
    hint: 'Several tags in one cell, separated by a pipe: priority|aged.',
    aliases: ['tag', 'labels', 'label', 'groups', 'group'],
  },
  {
    id: 'notes',
    header: 'notes',
    label: 'Notes',
    required: false,
    hint: 'Free text. Kept verbatim on the account.',
    aliases: ['note', 'comment', 'comments', 'remarks', 'description'],
  },
]

export const FIELD_BY_ID = new Map(FIELDS.map((f) => [f.id, f]))
export const REQUIRED_FIELDS = FIELDS.filter((f) => f.required)
export const OPTIONAL_FIELDS = FIELDS.filter((f) => !f.required)
export const SECRET_FIELDS = new Set(FIELDS.filter((f) => f.secret).map((f) => f.id))

export function fieldLabel(id: Mapped): string {
  return id === IGNORE ? 'Ignore' : (FIELD_BY_ID.get(id)?.label ?? id)
}

/** A mapped row, keyed by field. An unmapped column is absent, not an empty string. */
export type RowValues = Partial<Record<FieldId, string>>

/* ------------------------------------------------------------------ template */

/**
 * Three example rows, not one: a single row cannot show that `tags` holds several
 * values, that `loyalty_points` is a bare integer, or that the optional columns may
 * simply be left empty. The third row is deliberately sparse for that last reason.
 */
const TEMPLATE_ROWS: string[][] = [
  [
    'a.hughes@mail.com',
    'W1nterGr0ve!',
    'Arsenal',
    'season-ticket',
    'ARS-4820117',
    'Amelia',
    'Hughes',
    '+44 7700 900312',
    '1991-04-17',
    '2480',
    '198.51.100.14:8080:fetchuser:Kp8sVq2r',
    'a.hughes.otp@mail.com',
    'M4ilbox-Key',
    'priority|aged',
    'Renewal handled by the club directly.',
  ],
  [
    'j.moreau@mail.com',
    'CoteDazur#22',
    'Manchester United',
    'official-member',
    'MU-7719043',
    'Julien',
    'Moreau',
    '+44 7700 900871',
    '1988-11-02',
    '640',
    '198.51.100.27:8080:fetchuser:Zt4wLb9n',
    'j.moreau.otp@mail.com',
    'Inb0x-Secret',
    'away-eligible',
    '',
  ],
  [
    'p.okafor@mail.com',
    'Harbour!7712',
    'Tottenham Hotspur',
    'digital-member',
    '',
    'Priya',
    'Okafor',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
]

/** RFC 4180 quoting — the same rule the exporter uses, so a round trip survives. */
function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function templateCsv(): string {
  const lines = [FIELDS.map((f) => f.header).join(',')]
  for (const row of TEMPLATE_ROWS) lines.push(row.map(escape).join(','))
  // CRLF, because Excel on Windows is the tool that opens this.
  return lines.join('\r\n')
}
