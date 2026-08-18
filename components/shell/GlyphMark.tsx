import { cn } from '@/lib/utils'

/**
 * A decorative terminal glyph at 4–6% opacity.
 *
 * Rules (§3.3b guardrails): at most ONE per viewport region, and never behind a
 * data table or a form. Restricted by convention to the shell's empty content
 * area and to empty states — nowhere a user has to read a value.
 */
const GLYPHS = {
  code: '</>',
  braces: '{ }',
  brackets: '[ ]',
  prompt: '$_',
} as const

export function GlyphMark({
  glyph = 'code',
  className,
}: {
  glyph?: keyof typeof GLYPHS
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute font-mono leading-none font-bold text-text select-none',
        // whitespace-nowrap: `$_` and `{ }` must never wrap onto two lines.
        'text-[110px] whitespace-nowrap opacity-[0.05] sm:text-[160px]',
        className,
      )}
    >
      {GLYPHS[glyph]}
    </span>
  )
}
