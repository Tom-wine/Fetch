import { Prose } from '@/components/ui/typography'
import { GlyphMark } from './GlyphMark'

/**
 * The honest placeholder for a route that exists so nothing 404s but that has not
 * been built yet (§9 rule: nav is never dead). Carries the shell's one permitted
 * glyph mark, because this region holds no data.
 */
export function ComingSoon({ what }: { what: string }) {
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden">
      <GlyphMark glyph="prompt" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="relative max-w-md text-center">
        <div className="font-mono text-label text-muted">{'// coming_soon'}</div>
        <Prose className="mt-3 text-muted">{what}</Prose>
      </div>
    </div>
  )
}
