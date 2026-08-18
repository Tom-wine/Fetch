/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils'
import { getClub, type ClubId } from '@/lib/registries/clubs'

/**
 * Crest + club name. The name renders VERBATIM — a club is user-facing domain data,
 * never snake_cased (§3.3b guardrail 1): `Manchester United`, not `manchester_united`.
 *
 * Plain <img> rather than next/image: the crests are tiny local SVGs, so the
 * optimiser adds a request and a layout wrapper for nothing.
 */
export function ClubBadge({
  club: clubId,
  /** `short` in dense table cells, `full` in pickers and headers. */
  variant = 'short',
  size = 'md',
  className,
}: {
  club: ClubId
  variant?: 'short' | 'full' | 'crest-only'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const club = getClub(clubId)
  const px = size === 'sm' ? 16 : size === 'lg' ? 28 : 20

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <img
        src={club.crest}
        alt=""
        width={px}
        height={px}
        className="shrink-0"
        style={{ width: px, height: px }}
      />
      {variant !== 'crest-only' && (
        <span className="truncate text-body">{variant === 'full' ? club.name : club.short}</span>
      )}
      {variant === 'crest-only' && <span className="sr-only">{club.name}</span>}
    </span>
  )
}
