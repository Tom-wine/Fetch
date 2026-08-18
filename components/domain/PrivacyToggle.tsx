'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The privacy blur (§7 #27). Sets `data-privacy` on <html>; `globals.css` does the
 * rest, blurring every element carrying `.money` app-wide. One rule, one class —
 * no component reimplements it.
 */

interface PrivacyContextValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = React.createContext<PrivacyContextValue>({
  hidden: false,
  toggle: () => {},
})

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = React.useState(false)

  React.useEffect(() => {
    document.documentElement.dataset.privacy = hidden ? 'on' : 'off'
  }, [hidden])

  const value = React.useMemo(() => ({ hidden, toggle: () => setHidden((v) => !v) }), [hidden])

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy(): PrivacyContextValue {
  return React.useContext(PrivacyContext)
}

export function PrivacyToggle({ className }: { className?: string }) {
  const { hidden, toggle } = usePrivacy()
  const Icon = hidden ? EyeOff : Eye

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            aria-pressed={hidden}
            aria-label={hidden ? 'Show monetary values' : 'Hide monetary values'}
            className={cn(
              'flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text',
              hidden && 'border-primary/30 bg-primary/12 text-primary-ink',
              className,
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="font-mono text-chip">
          {hidden ? 'show_values' : 'hide_values'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
