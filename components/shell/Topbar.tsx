'use client'

import { ChevronDown, LogOut, Menu, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initialsOf, useProfile } from '@/lib/format/LocaleProvider'
import { Hint } from '@/components/ui/tooltip'
import { CURRENT_USER } from './nav-config'
import { NotificationPopover } from './NotificationPopover'
import { ThemeSegment } from './ThemeSegment'

/**
 * Floats over the content with no background of its own (§4). The controls carry
 * their own surface so they stay legible against whatever scrolls beneath them.
 */
export function Topbar({
  onOpenNav,
  onOpenSearch,
}: {
  onOpenNav: () => void
  onOpenSearch: () => void
}) {
  const profile = useProfile()

  return (
    // <header>, not <div>: this is the banner landmark. As a plain div the theme
    // segment, the search trigger and the account menu sat outside every landmark,
    // which is an axe `region` violation and, more to the point, leaves a screen-reader
    // user with no way to jump to the app's chrome.
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-2 px-4 sm:px-6">
      <Hint label="Open navigation" side="bottom">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="pointer-events-auto flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text lg:hidden"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>
      </Hint>

      <div className="pointer-events-auto ml-auto flex items-center gap-2">
        {/*
          The same palette ⌘K opens. It is a button rather than an input: nothing is
          typed here, and a text field that steals focus into a dialog is a field that
          loses the first keystroke.
        */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K"
          className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-muted transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-text sm:flex"
        >
          <Search className="size-4" aria-hidden="true" />
          <span className="text-caption">search</span>
          <kbd className="ml-2 rounded-sm border border-border px-1.5 py-0.5 text-caption">⌘K</kbd>
        </button>

        {/* Below sm the label and the shortcut do not fit; the icon still does. */}
        <Hint label="Search" side="bottom">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search"
            className="pointer-events-auto flex size-9 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:text-text sm:hidden"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </Hint>

        <ThemeSegment />
        <NotificationPopover />

        <DropdownMenu>
          <Hint label={`${profile.name} — account menu`} side="bottom">
            <DropdownMenuTrigger
              aria-label="Account menu"
              className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface pr-2 pl-1 transition-colors duration-150 hover:bg-surface-hover"
            >
              <Avatar className="size-7">
                {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
                <AvatarFallback className="bg-surface-raised text-caption font-medium text-muted">
                  {initialsOf(profile.name)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-3 text-faint" aria-hidden="true" />
            </DropdownMenuTrigger>
          </Hint>
          <DropdownMenuContent align="end" className="w-56 border-border bg-surface">
            <DropdownMenuLabel className="font-normal">
              {/* User data renders verbatim (§3.3b guardrail). */}
              <div className="text-body font-medium text-text">{profile.name}</div>
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
    </header>
  )
}
