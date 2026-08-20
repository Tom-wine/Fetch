/* eslint-disable @next/next/no-img-element */

/**
 * A screenshot in a guide.
 *
 * Framed like a card so it reads as a picture OF the app rather than as part of the
 * page, and captioned from its own alt text — a screenshot with no caption makes the
 * reader work out which part of it they were meant to look at.
 *
 * Deliberately not next/image: these are local PNGs of known size served from /public,
 * the optimiser adds a request and a layout dance for no benefit at this scale, and a
 * guide that is slow to paint is a guide nobody scrolls.
 */
export function GuideImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null

  return (
    <figure className="mt-6">
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        className="w-full rounded-lg border border-border bg-surface"
      />
      {alt && (
        <figcaption className="mt-2 font-mono text-caption text-faint">{`// ${alt}`}</figcaption>
      )}
    </figure>
  )
}
