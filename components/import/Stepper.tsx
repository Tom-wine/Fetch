'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import { step as stepLabel } from '@/lib/format/text'

/**
 * The visible progress indicator for §8.3's four-step import.
 *
 * A wizard without one is a wizard that feels like it might go on forever. The rail
 * is also the navigation: a completed step is a button, because the single most
 * common thing an operator does in step 3 is realise they mapped a column wrong and
 * want to go back — and a wizard that makes them start the upload again to do it is
 * the reason people give up on CSV imports.
 *
 * Steps read `01_upload` (§3.3b, via `step()`), which is the same grammar the nav
 * and the section labels use.
 */

export interface StepDefinition {
  id: string
  label: string
}

export function Stepper({
  steps,
  current,
  /** How far the operator has actually got — everything up to here is clickable. */
  furthest,
  onSelect,
  className,
}: {
  steps: StepDefinition[]
  current: number
  furthest: number
  onSelect: (index: number) => void
  className?: string
}) {
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100

  return (
    <div className={cn('space-y-3', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((definition, index) => {
          const done = index < current
          const active = index === current
          const reachable = index <= furthest

          return (
            <li key={definition.id} className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                disabled={!reachable || active}
                onClick={() => onSelect(index)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md px-2 py-1 font-mono text-btn font-semibold tracking-[0.06em] transition-colors duration-150',
                  active && 'bg-primary/12 text-primary-ink',
                  !active && done && 'text-muted hover:bg-surface-hover hover:text-text',
                  !active && !done && 'text-faint',
                  !reachable && 'cursor-not-allowed',
                  active && 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] leading-none',
                    active && 'border-primary bg-primary text-white',
                    done && 'border-success/40 bg-success/15 text-success-ink',
                    !active && !done && 'border-border text-faint',
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-3" /> : index + 1}
                </span>
                <span className="truncate">{stepLabel(index + 1, definition.label)}</span>
              </button>

              {index < steps.length - 1 && (
                <span className="hidden text-faint sm:inline" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* The bar is decorative — the <ol> above already carries the state for a
          screen reader, and a second announcement of the same fact is noise. */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-raised" aria-hidden="true">
        <div
          className="h-full rounded-full bg-fetch-gradient transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
    </div>
  )
}
