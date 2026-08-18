'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import type { Fixture } from '@/lib/types'
import { Money } from '@/components/domain/Money'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { rampFill, rampText, useUrgency } from './urgency'

/**
 * VALUE AT RISK — the Fetch.io column, and the one number the operator actually
 * feels: the face value of every seat that is neither sold nor transferred yet.
 *
 * Three things make it read rather than just render:
 *  - the figure ramps with the countdown (§8.4), so unsold stock inside seven days
 *    is red without anyone reading the kickoff column;
 *  - the seat count sits under it, because "£4,200" means nothing until you know it
 *    is 3 seats and not 30;
 *  - a hairline bar shows the unsold share of the fixture, so a half-empty allocation
 *    and an almost-clear one are distinguishable at a glance down the column.
 *
 * Zero at risk is deliberately quiet — cleared stock should recede, not compete with
 * the fixture that is bleeding.
 */
export function ValueAtRisk({
  fixture,
  size = 'md',
  className,
}: {
  fixture: Fixture
  size?: 'md' | 'lg'
  className?: string
}) {
  const urgency = useUrgency(fixture.kickoff)
  const { total, sold, transferred } = fixture.counts
  const unsold = Math.max(0, total - sold - transferred)
  const share = total > 0 ? unsold / total : 0
  const clear = unsold === 0 || fixture.valueAtRisk === 0

  const figure = (
    <span
      className={cn(
        'flex flex-col items-end gap-1',
        size === 'lg' ? 'text-title' : 'text-body',
        className,
      )}
    >
      <Money
        amount={fixture.valueAtRisk}
        currency={fixture.currency}
        className={cn('font-semibold', clear ? 'text-faint' : rampText(urgency))}
      />
      <span className="text-caption text-faint tabular-nums">
        {clear ? 'all clear' : `${unsold} unsold`}
      </span>
      <span aria-hidden="true" className="h-0.5 w-16 overflow-hidden rounded-full bg-border">
        <span
          className={cn('block h-full rounded-full', clear ? 'bg-transparent' : rampFill(urgency))}
          style={{ width: `${Math.round(share * 100)}%` }}
        />
      </span>
    </span>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex justify-end rounded-sm">
            {figure}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] font-prose text-prose">
          {hint(unsold, urgency === 'past')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Plain sentences — a risk figure is the last place for `// snake_case` (guardrail 2). */
function hint(unsold: number, past: boolean): string {
  if (unsold === 0) return 'Every seat is sold or transferred. Nothing is at risk on this fixture.'
  const seats = unsold === 1 ? '1 seat' : `${unsold} seats`
  if (past) return `Kickoff has passed and ${seats} were never sold. This value is gone.`
  return `Face value of the ${seats} still unsold. It stops being recoverable at kickoff.`
}
