import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Prose, SectionLabel } from '@/components/ui/typography'

/**
 * The two shapes every settings tab is made of.
 *
 * A card groups related settings under one heading; a row is one setting: what it is
 * called, one sentence on what it does, and the control that changes it. Both are
 * local to /settings rather than shared, for the same reason `dashboard/Panel.tsx`
 * says it is local to /dashboard — the recipe is three lines of Tailwind and a shared
 * version would immediately grow props for the differences.
 *
 * The row puts its description under the label rather than beside the control,
 * because a setting an operator does not understand is a setting they will not touch,
 * and the explanation should be readable before the eye reaches the switch.
 */
export function SettingsCard({
  title,
  label,
  children,
  footer,
  className,
}: {
  /** Chrome string, written normally. UPPER_SNAKE'd here per §3.3b. */
  title: string
  /** The `// lower_snake` sub-label §3.3 puts above every panel. */
  label?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-lg border border-border bg-surface shadow-sm dark:shadow-none',
        className,
      )}
    >
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-title font-semibold text-text">{upperSnake(title)}</h2>
        {label && <SectionLabel className="mt-1.5">{label}</SectionLabel>}
      </header>

      <div className="divide-y divide-border">{children}</div>

      {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
    </section>
  )
}

export function SettingRow({
  label,
  description,
  htmlFor,
  control,
  /** Stacks the control under the text — for anything wider than a switch. */
  stacked = false,
}: {
  label: string
  description?: React.ReactNode
  /** Points the label at its control, so clicking the text focuses the field. */
  htmlFor?: string
  control: React.ReactNode
  stacked?: boolean
}) {
  const text = (
    <div className="min-w-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-body font-medium text-text">
          {label}
        </label>
      ) : (
        <span className="block text-body font-medium text-text">{label}</span>
      )}
      {description && (
        <Prose className="mt-1 block max-w-prose text-[12px] leading-snug text-muted">
          {description}
        </Prose>
      )}
    </div>
  )

  if (stacked) {
    return (
      <div className="space-y-3 px-5 py-4">
        {text}
        {control}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      {text}
      <div className="shrink-0">{control}</div>
    </div>
  )
}
