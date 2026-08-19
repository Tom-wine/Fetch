'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 origin-[--radix-tooltip-content-transform-origin] animate-in overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      className,
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * An icon-only control and its tooltip in one wrapper.
 *
 * §11 asks every icon-only control to carry BOTH an accessible name and a tooltip:
 * the name for a screen reader, the tooltip for the sighted user who does not
 * recognise the glyph. They are different audiences with the same question, and the
 * four-component Radix incantation was long enough that controls kept shipping with
 * only the aria-label.
 *
 * `children` must be a single element that forwards a ref — the trigger is `asChild`,
 * so a Radix `DropdownMenuTrigger` or `PopoverTrigger` composes here directly rather
 * than being wrapped in a span that would break the menu's positioning.
 *
 * 300ms rather than the 200ms used elsewhere: these sit in table rows, and a mouse
 * crossing twenty-five of them should not leave a trail of tooltips.
 */
export function Hint({
  label,
  side = 'top',
  children,
}: {
  label: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactNode
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} className="max-w-[240px] font-prose text-prose">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
