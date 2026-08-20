import * as React from 'react'
import { Slot, Slottable } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'

/**
 * Buttons speak the terminal grammar (§3.3b): mono 600, 12px, UPPER_SNAKE,
 * 0.06em tracking. The forward/primary action carries a trailing `→`; a dynamic
 * count sits in parens outside the snake — `DELETE_ACCOUNTS (4)`.
 */
const buttonVariants = cva(
  // Disabled is a GHOST, not a dimmed fill. `opacity-50` over a solid primary still
  // reads as a live button in light at 1440 -- `LOAD_ACCOUNTS (0)` looked clickable and
  // was not. Stripping the fill (`bg-none` for the gradient, `bg-transparent` for the
  // solid) and the border colour leaves one shape for "not available right now",
  // whichever variant was asked for.
  'inline-flex items-center justify-center gap-2 rounded-md font-mono text-btn font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:border disabled:border-border disabled:bg-transparent disabled:bg-none disabled:text-faint disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Filled buttons use primary-solid, not primary: white carries 4.95:1 on
        // #0B6FD4 but only 3.5:1 on #1A8CF0 (§3.1).
        default: 'bg-primary-solid text-white hover:bg-primary-hover active:bg-primary-press',
        gradient: 'bg-fetch-gradient text-white hover:shadow-fetch-glow',
        secondary:
          'border border-border bg-surface text-text hover:border-border-strong hover:bg-surface-hover',
        ghost: 'text-muted hover:bg-surface-hover hover:text-text',
        warning: 'border border-warning/30 bg-warning/12 text-warning-ink hover:bg-warning/20',
        danger: 'border border-danger/30 bg-danger/12 text-danger-ink hover:bg-danger/20',
        link: 'text-primary-ink underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3',
        default: 'h-9 px-4',
        lg: 'h-10 px-5',
        icon: 'size-9 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Chrome label, written normally ("Import CSV"). It is UPPER_SNAKE'd here so the
   * grammar is applied in one place. Never pass user data through this — pass
   * children instead.
   */
  label?: string
  /** Appended as ` (N)` outside the snake. */
  count?: number
  /** Trailing `→`. Use on the forward/primary action of a screen or step. */
  forward?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, label, count, forward, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const text = label ? upperSnake(label) : null

    return (
      // Slottable marks which child Slot should merge its props onto. Without it,
      // `asChild` hands Slot up to three children — the caller's element, the label
      // span and the arrow — and Slot requires exactly one, so it throws
      // "Slot failed to slot onto its children". With it, the label and arrow are
      // rendered as siblings *inside* the caller's element instead.
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        <Slottable>{children}</Slottable>
        {text ? (
          <span>
            {text}
            {count === undefined ? '' : ` (${count})`}
          </span>
        ) : null}
        {forward ? <span aria-hidden="true">→</span> : null}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
