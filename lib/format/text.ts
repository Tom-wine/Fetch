/**
 * Terminal copy grammar (§3.3b).
 *
 * Fetch.io writes its own chrome like a terminal: nav items are `lower_snake_case`,
 * column headers and buttons are `UPPER_SNAKE`, section labels are prefixed `// `.
 * These helpers exist so that grammar is applied in exactly one place.
 *
 * ---------------------------------------------------------------------------
 * ⚠️  GUARDRAIL — CHROME STRINGS ONLY.
 *
 * Never pass user or domain data through `snake()` / `upperSnake()`. Emails,
 * people's names, club names, fixtures, venues, tags and notes render VERBATIM.
 *
 *   ✓ ARSENAL v CHELSEA        ✕ arsenal_v_chelsea
 *   ✓ j.moreau@mail.com        ✕ j_moreau_mail_com
 *
 * Prose that has to be understood under pressure — confirm dialogs, validation
 * errors, empty-state bodies — is written as plain sentences in <Prose>, not as
 * snake case:
 *
 *   ✓ "Delete 4 accounts? This cannot be undone."   ✕ // delete_failed
 * ---------------------------------------------------------------------------
 */

/** Collapse any chrome label to `lower_snake_case`. Chrome strings only. */
export function snake(label: string): string {
  return label
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

/** Collapse any chrome label to `UPPER_SNAKE` — column headers, buttons, chips. */
export function upperSnake(label: string): string {
  return snake(label).toUpperCase()
}

/** `// section_label` — the comment prefix used above every card, group and panel. */
export function comment(label: string): string {
  return `// ${snake(label)}`
}

/**
 * `DELETE_ACCOUNTS (4)` — a dynamic count sits in parens OUTSIDE the snake, so the
 * number never gets swept into the label.
 */
export function withCount(label: string, count: number | undefined): string {
  const base = upperSnake(label)
  return count === undefined ? base : `${base} (${count})`
}

/** Wizard steps read `02_map_columns`. */
export function step(index: number, label: string): string {
  return `${String(index).padStart(2, '0')}_${snake(label)}`
}
