'use client'

import { ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CURRENT_USER } from './nav-config'
import { NotificationPopover } from './NotificationPopover'
import { ThemeSegment } from './ThemeSegment'

/**
 * Floats over the content with no background of its own (§4). The controls carry
 * their own surface so they stay legible against whatever scrolls beneath them.
 */
export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-2 px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="pointer-events-auto flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text lg:hidden"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      <div className="pointer-events-auto ml-auto flex items-center gap-2">
        {/* Non-functional until the ⌘K palette lands in Part 10. */}
        <button
          type="button"
          disabled
          aria-label="Search — coming soon"
          className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-faint sm:flex"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="text-caption">search</span>
          <kbd className="ml-2 rounded-sm border border-border px-1.5 py-0.5 text-caption">⌘K</kbd>
        </button>

        <ThemeSegment />
        <NotificationPopover />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface pr-2 pl-1 transition-colors duration-150 hover:bg-surface-hover"
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-surface-raised text-caption font-medium text-muted">
                {CURRENT_USER.initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-3 text-faint" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-surface">
            <DropdownMenuLabel className="font-normal">
              {/* User data renders verbatim (§3.3b guardrail). */}
              <div className="text-body font-medium text-text">{CURRENT_USER.name}</div>
              <div className="text-caption text-faint">{CURRENT_USER.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-body">
              <Link href="/settings">
                <User className="size-4" aria-hidden="true" />
                profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-body">
              <Link href="/settings">
                <Settings className="size-4" aria-hidden="true" />
                settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-body text-danger-ink">
              <LogOut className="size-4" aria-hidden="true" />
              sign_out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
