import { cn } from '@/lib/utils'
import { getPlatform, type Platform } from '@/lib/registries/platforms'
import { getProvider, type ProviderId } from '@/lib/registries/providers'

/**
 * Marketplace mark + name. Brand names render verbatim — `StubHub`, not `stubhub`.
 * The mark is a two-letter tile tinted with the platform's own colour, so the row
 * can be scanned by colour before it is read.
 */
export function PlatformBadge({
  platform,
  showName = true,
  className,
}: {
  platform: Platform
  showName?: boolean
  className?: string
}) {
  const p = getPlatform(platform)
  return (
    <Mark mark={p.mark} name={p.name} color={p.color} showName={showName} className={className} />
  )
}

/** Same treatment for where the ticket was bought (§5 `ProviderId`). */
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
