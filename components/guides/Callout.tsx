import { AlertTriangle, Info, OctagonAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The one component a guide can use that Markdown has no syntax for.
 *
 * Three types and no more: a note is worth knowing, a warning costs you a run, a danger
 * costs you an account. Anything that needs a fourth tone is probably a paragraph.
 *
 * Tones come from the app's own status palette, so `warning` in a guide is the same
 * amber as NEEDS_LOGIN on the pool table — the reader learns one vocabulary.
 */
const TONES = {
  note: {
    icon: Info,
    label: 'Note',
    box: 'border-primary/30 bg-primary/8',
    ink: 'text-primary-ink',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    box: 'border-warning/30 bg-warning/12',
    ink: 'text-warning-ink',
  },
  danger: {
    icon: OctagonAlert,
    label: 'Careful',
    box: 'border-danger/30 bg-danger/12',
    ink: 'text-danger-ink',
  },
} as const

export function Callout({
  type = 'note',
  title,
  children,
}: {
  type?: keyof typeof TONES
  title?: string
  children: React.ReactNode
}) {
  const tone = TONES[type]
  const Icon = tone.icon

  return (
    <aside className={cn('mt-6 flex gap-3 rounded-lg border p-4', tone.box)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone.ink)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn('font-mono text-label uppercase', tone.ink)}>{title ?? tone.label}</p>
        {/* `[&>p]:mt-2` rather than a wrapper: the children are MDX paragraphs, which
            already carry the prose treatment from the component map. */}
        <div className="[&>*:first-child]:mt-2">{children}</div>
      </div>
    </aside>
  )
}
