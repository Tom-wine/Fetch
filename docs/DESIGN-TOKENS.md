# Fetch.io — Design tokens

Every hex in this app lives in `app/globals.css` and nowhere else. This file is the
human-readable companion to it. Source of truth: `FETCH-IO-BUILD-PLAN.md` §3 and the
brand sheet (`fetch-io-brand-sheet.html`).

This project is on **Tailwind CSS v4**, which is CSS-first: there is no
`tailwind.config.ts`. Raw values live on `:root` / `.dark`; `@theme inline` maps them
into Tailwind's namespaces so utilities are generated and stay theme-switchable.

---

## 1. Palette

Values are the exact §3.1 hexes. Do not substitute Tailwind defaults, do not round.

### Canvas and ink

| Token           | Utility               | Dark      | Light     | Use                                       |
| --------------- | --------------------- | --------- | --------- | ----------------------------------------- |
| `bg`            | `bg-bg`               | `#07080B` | `#FFFFFF` | app + sidebar canvas                      |
| `surface`       | `bg-surface`          | `#0E1116` | `#FFFFFF` | cards, panels, table container            |
| `surface-raised`| `bg-surface-raised`   | `#161A21` | `#F3F5F9` | table header row, inputs, popovers        |
| `surface-hover` | `bg-surface-hover`    | `#1C222B` | `#E9EDF4` | row hover, ghost-button hover             |
| `border`        | `border-border`       | `#242A34` | `#E1E6EE` | 1px dividers                              |
| `border-strong` | `border-border-strong`| `#333B48` | `#C8D1DF` | focused inputs, dividers that must read   |
| `text`          | `text-text`           | `#ECF2F8` | `#0B1220` | primary copy                              |
| `text-muted`    | `text-muted`          | `#9AA6B8` | `#5A6577` | secondary copy                            |
| `text-faint`    | `text-faint`          | `#7A8698` | `#626D80` | timestamps, disabled                      |

### Brand — theme-invariant, sampled from the logo

| Token           | Utility              | Value     | Use                                              |
| --------------- | -------------------- | --------- | ------------------------------------------------ |
| `primary`       | `bg-primary`         | `#1A8CF0` | links, active nav, selection, focus ring, chips  |
| `primary-solid` | `bg-primary-solid`   | `#0B6FD4` | **filled buttons with white text** — 4.95:1      |
| `primary-hover` | `hover:bg-primary-hover` | `#1A8CF0` | hover of a solid button                      |
| `primary-press` | `active:bg-primary-press` | `#0A5FB8` | pressed state                               |
| `primary-ink`   | `text-primary-ink`   | `#0B63C9` (light) / `#1A8CF0` (dark) | primary **text**       |
| `cyan`          | `text-cyan`          | `#5FD0FA` | highlights, sparklines, glow                     |
| `deep`          | `bg-deep`            | `#0057C8` | gradient start                                   |

> **Why two blues.** `primary` reads at 5.5:1 on the dark surface, so links, active nav
> and chip text use it. White on that same blue is only 3.5:1, so filled buttons use
> `primary-solid`, which carries white at 4.95:1. Both are sampled from the logo.

### Status

| Token          | Utility          | Hue       | Ink (light) | Use                                    |
| -------------- | ---------------- | --------- | ----------- | -------------------------------------- |
| `success`      | `text-success`   | `#22D18A` | `#0A7B54`   | money in, ACTIVE, healthy account      |
| `warning`      | `text-warning`   | `#F5A524` | `#B45309`   | relogin, OTP, expiring membership      |
| `danger`       | `text-danger`    | `#FF4D6A` | `#C81E3C`   | locked, blocked, delete, SOLD_OUT      |
| `violet`       | `text-violet`    | `#A78BFA` | `#6D28D9`   | sold count, block numbers              |
| `neutral-chip` | `text-neutral-chip` | `#9AA6B8` | `#5A6577` | INACTIVE and other non-signals         |

Each hue has an `-ink` companion (`text-success-ink`, …). In **light** mode it is the
darker §3.1 `statusInk` value; in **dark** mode it collapses onto the raw hue. That is
what lets one chip class work in both themes:

```
rounded-sm border px-2 py-0.5 text-chip font-medium
bg-success/15 text-success-ink border-success/25       ← dark
bg-success/12 text-success-ink border-success/30       ← light (opacity differs only)
```

### Contrast ledger (verified, not eyeballed)

| Pair                        | Dark   | Light            | Verdict |
| --------------------------- | ------ | ---------------- | ------- |
| text on surface             | 16.8:1 | 18.7:1           | AAA     |
| muted on surface            | 7.7:1  | 5.9:1            | AA      |
| faint on surface_raised     | 4.7:1  | 4.8:1            | AA      |
| accent as link text         | 5.5:1  | 5.8:1 (`#0B63C9`)| AA      |
| white on primary_solid      | 4.95:1 | 4.95:1           | AA      |
| success chip text on chip bg| 7.4:1  | 4.8:1 (`#0A7B54`)| AA      |
| danger chip text on chip bg | 5.0:1  | 4.9:1            | AA      |
| violet chip text on chip bg | 5.6:1  | 6.1:1            | AA      |

`scripts/check-contrast.ts` (Part 11) re-verifies these and fails the build.

### shadcn aliases

The shadcn semantic names (`--background`, `--card`, `--popover`, `--accent`,
`--destructive`, `--input`, `--ring`, `--radius`, `--sidebar-*`) are declared as
`var()` references onto the Fetch tokens, so any primitive generated later is on-brand
automatically. One deliberate divergence: **`text-muted` / `bg-muted` mean the §3.1
muted _ink_, not a surface.** Generated components that use `bg-muted` as a surface are
patched to `bg-surface-raised` on the way in.

---

## 2. Signature gradient — five allowed uses, and nowhere else

```css
--fetch-gradient: linear-gradient(135deg, #0057C8 0%, #1A8CF0 48%, #6FD3FA 100%);
--fetch-glow:     0 0 24px -4px rgb(26 140 240 / .55);   /* hover only, never at rest */
```

Utilities: `bg-fetch-gradient`, `shadow-fetch-glow`.

1. The sidebar logo mark.
2. `StatTile` icon squares (48px rounded square, gradient background, white icon).
3. The dashboard onboarding / promo banner.
4. A 1px top hairline on the active sidebar item.
5. The `Import accounts` primary CTA on the empty accounts state — glow on hover only.

Never a gradient on body text, on table rows, or on more than one element in the same
viewport region.

---

## 3. Typography — two families, no third

**JetBrains Mono is the default UI font.** `--font-sans` deliberately resolves to it, so
an unstyled element lands on mono rather than a proportional face. **Outfit** appears
only as Black (900) uppercase display, and as Regular (400) prose.

Only `components/ui/typography.tsx` and `components/ui/button.tsx` set a font family.
No other component does.

| Role                | Utility        | Spec                                    |
| ------------------- | -------------- | --------------------------------------- |
| KPI value           | `text-kpi`     | Outfit 900 · 30px · -0.02em             |
| h1 page title       | `text-display` | Outfit 900 · 28px · uppercase · -0.02em |
| h2 section          | `text-h2`      | Outfit 900 · 18px · -0.02em             |
| prose               | `text-prose`   | Outfit 400 · 14px · 1.6                 |
| card title          | `text-title`   | mono 600 · 14px · uppercase · 0.02em    |
| body / table cell   | `text-body`    | mono 400 · 13px · -0.01em               |
| nav item            | `text-nav`     | mono 400 · 13px · lower_snake_case      |
| status chip         | `text-chip`    | mono 500 · 12px · 0.04em · UPPER_SNAKE  |
| button              | `text-btn`     | mono 600 · 12px · 0.06em · UPPER_SNAKE  |
| section label / column header | `text-label` | mono 400 · 11px · 0.08em       |
| caption / timestamp | `text-caption` | mono 400 · 11px                         |

> The size token is `text-title`, not `text-card`, because `--color-card` already
> generates a `text-card` colour utility and the two would collide.

**Ligatures are off globally** (`font-variant-ligatures: none` plus `'liga' 0, 'calt' 0`).
JetBrains Mono otherwise renders `->` and `!=` as single glyphs, which corrupts data
cells. They are re-enabled only inside `pre`, `code` and `.csv-preview`.

Mono runs ~12% wider than a proportional face. Every table is re-checked at 1280px; if
columns crowd, **hide columns rather than shrinking type below 13px**.

---

## 4. Terminal copy grammar

Fetch.io writes its own chrome like a terminal. `lib/format/text.ts` owns the grammar —
`snake()`, `upperSnake()`, `comment()`, `withCount()`, `step()` — so it is applied in one
place and never by hand.

| Element        | Form                                    |
| -------------- | --------------------------------------- |
| section label  | `// account_health`                     |
| column header  | `VALUE_AT_RISK`                         |
| button         | `IMPORT_CSV →`                          |
| button + count | `DELETE_ACCOUNTS (4)`                   |
| nav item       | `my_listings` · active `//account_manager` |
| status chip    | `NEEDS_OTP`                             |
| wizard step    | `02_map_columns`                        |
| helper text    | `// passwords never leave memory`       |

### Guardrails

| ✓                                                | ✕                                    |
| ------------------------------------------------ | ------------------------------------ |
| `ARSENAL v CHELSEA`                               | `arsenal_v_chelsea`                  |
| `"Delete 4 accounts? This cannot be undone."`     | `// delete_failed`                   |
| ligatures off in cells                            | `->` rendered as an arrow glyph      |
| one glyph mark per region                         | glyphs behind a table                |

**User and domain data is never snake_cased.** Emails, people's names, club names,
fixtures, venues, tags and notes render verbatim. Prose that has to be understood under
pressure — confirm dialogs, validation errors, empty-state bodies — is written as plain
sentences in `<Prose>`, never as snake case.

The decorative `<GlyphMark>` (`</>`, `{ }`, `[ ]`, `$_`) renders at 4–6% opacity,
`aria-hidden`, `pointer-events-none`. **Max one per viewport region, and never behind a
data table or a form** — it is restricted to the shell's empty content area and to empty
states.

---

## 5. Shape, depth, motion

**Radii** — `rounded-sm` 8px (chips, inputs) · `rounded-md` 12px (buttons, menu items) ·
`rounded-lg` 14px (cards, panels) · `rounded-xl` 20px (modals) · `rounded-full`
(avatars, pagination).

**Depth** — dark mode uses surface steps, not shadows (`bg → surface → surface-raised`).
Light mode uses `shadow-sm` plus a 1px border. Modals get one real shadow in both themes.

**Focus** — `outline: 2px solid var(--primary); outline-offset: 2px`, declared globally on
`:focus-visible`. Always visible, never removed.

**Spacing** — 4px base. Card `p-4` / `p-6`. Toolbar `gap-3`. Table cell `px-4 py-3`
(`py-2` in compact density).

**Motion** — sidebar collapse `300ms ease-in-out`; everything else `150ms`. No spring, no
bounce. `prefers-reduced-motion: reduce` drops all non-essential transitions to ~0ms; the
dashboard caret stops blinking and stays visible rather than freezing mid-blink.

---

## 6. Privacy blur

`PrivacyToggle` sets `data-privacy="on"` on the document root. Every monetary value
carries `.money`, and `[data-privacy='on'] .money` applies `filter: blur(6px)` plus
`user-select: none`. Declared once in `globals.css`; no component reimplements it.
