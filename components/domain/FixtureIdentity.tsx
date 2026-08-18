import { cn } from '@/lib/utils'
import { getClub, type ClubId } from '@/lib/registries/clubs'
import { COMPETITION_LABEL, type Competition } from '@/lib/registries/providers'
import { ClubBadge } from './ClubBadge'
import { Chip } from './StatusChip'

/**
 * The first column of every fixture table (§7 #14): home crest, `HOME v AWAY`,
 * then competition and matchweek chips.
 *
 * The teams render VERBATIM in their own uppercase — `ARSENAL v CHELSEA`, which is
 * how a fixture is written, not `arsenal_v_chelsea` (§3.3b guardrail 1). The
 * lowercase `v` is deliberate and is what separates this from a snake_case label.
 */
export function FixtureIdentity({
  homeClub,
  awayClub,
  competition,
  matchweek,
  size = 'md',
  className,
}: {
  homeClub: ClubId
  awayClub: ClubId
  competition: Competition
  matchweek?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const home = getClub(homeClub)
  const away = getClub(awayClub)

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <ClubBadge club={homeClub} variant="crest-only" size={size === 'lg' ? 'lg' : 'md'} />
      <div className="min-w-0">
        <div
          className={cn(
            'truncate font-semibold uppercase',
            size === 'lg' ? 'text-title' : 'text-body',
          )}
        >
          {home.short} <span className="text-muted lowercase">v</span> {away.short}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Chip tone="neutral">{COMPETITION_LABEL[competition]}</Chip>
          {matchweek !== undefined && <Chip tone="primary">MW {matchweek}</Chip>}
        </div>
      </div>
    </div>
  )
}
