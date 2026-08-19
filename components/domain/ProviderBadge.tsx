import { cn } from '@/lib/utils'
import { getProvider } from '@/lib/registries/providers'
import type { ProviderId } from '@/lib/types'

/**
 * A provider's two-letter mark and name — where an account BUYS: the club's own site,
 * or a primary seller in front of it.
 *
 * Moved out of the old `PlatformBadge.tsx` when the resale domain was deleted. That
 * file rendered resale venues and providers through one `Mark`; only the provider half
 * survives, so it lives under its own name rather than in a file called after the thing
 * that went.
 */
export function ProviderBadge({
  provider,
  showName = true,
  className,
}: {
  provider: ProviderId
  showName?: boolean
  className?: string
}) {
  const p = getProvider(provider)
  return (
    <Mark mark={p.mark} name={p.name} color={p.color} showName={showName} className={className} />
  )
}

function Mark({
  mark,
  name,
  color,
  showName,
  className,
}: {
  mark: string
  name: string
  color: string
  showName: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-caption font-semibold"
        // The brand colour comes from the registry, so it cannot live in globals.css
        // with the design tokens. This is the one sanctioned inline colour.
        style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
      >
        {mark}
      </span>
      {showName ? (
        <span className="truncate text-body">{name}</span>
      ) : (
        <span className="sr-only">{name}</span>
      )}
    </span>
  )
}
