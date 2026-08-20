import { cn } from '@/lib/utils'

/**
 * The gradient mark plus the FETCH.IO wordmark.
 * Allowed gradient use #1 of the five in §3.2 — the mark, and nothing around it.
 */
export function Logo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-fetch-gradient"
      >
        {/* A ticket streaking left-to-right, as in the logo. */}
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" aria-hidden="true">
          <path
            d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1.25a2.25 2.25 0 0 0 0 4.5v1.25a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 15.5v-1.25a2.25 2.25 0 0 0 0-4.5V8.5Z"
            fill="currentColor"
            fillOpacity=".9"
          />
        </svg>
      </span>
      {!collapsed && (
        <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-text uppercase">
          Fetch.io
        </span>
      )}
    </div>
  )
}
