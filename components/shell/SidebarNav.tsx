'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronDown, ExternalLink, PanelLeft } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { snake } from '@/lib/format/text'
import { SectionLabel } from '@/components/ui/typography'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsOf, useProfile } from '@/lib/format/LocaleProvider'
import { CURRENT_USER, NAV, NAV_FOOTER, isGroup, type NavItem } from './nav-config'
import { Logo } from './Logo'

function useIsActive() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  return React.useCallback(
    (href: string) => {
      const [path, query] = href.split('?')
      const wantedTab = query ? new URLSearchParams(query).get('tab') : null

      if (pathname !== path && !pathname.startsWith(`${path}/`)) return false
      // /accounts and /accounts?tab=proxies share a path; the tab decides.
      return wantedTab ? tab === wantedTab : !tab
    },
    [pathname, tab],
  )
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
}) {
  const Icon = item.icon
  const label = snake(item.label)

  const body = (
    <Link
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center gap-2.5 rounded-md px-2.5 transition-colors duration-150',
        // The active item carries a 1px gradient hairline on its top edge —
        // allowed gradient use #4 (§3.2).
        active
          ? 'bg-primary/12 text-primary-ink before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-md before:bg-fetch-gradient before:content-[""]'
          : 'text-muted hover:bg-surface-hover hover:text-text',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
      {!collapsed && (
        <span className="flex min-w-0 items-center truncate text-nav">
          {active && <span className="text-primary">{'//'}</span>}
          <span className="truncate">{label}</span>
          {item.external && (
            <ExternalLink className="ml-1 size-3 shrink-0 opacity-70" aria-hidden="true" />
          )}
        </span>
      )}
      {collapsed && <span className="sr-only">{label}</span>}
    </Link>
  )

  if (!collapsed) return body

  // Tooltips on the collapsed rail (§4).
  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="right" className="font-mono text-chip">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function SidebarNav({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean
  onToggle?: () => void
  className?: string
}) {
  const isActive = useIsActive()
  const profile = useProfile()

  return (
    <TooltipProvider delayDuration={100}>
      <nav
        aria-label="Main"
        className={cn(
          'flex h-full flex-col border-r border-border bg-bg',
          'transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[72px]' : 'w-64',
          className,
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center px-4',
            collapsed ? 'justify-center px-0' : 'justify-between',
          )}
        >
          <Link href="/dashboard" className="rounded-md">
            <Logo collapsed={collapsed} />
          </Link>
          {onToggle && !collapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="hidden size-7 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text lg:flex"
            >
              <PanelLeft className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {onToggle && collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="mx-auto mb-1 hidden size-7 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text lg:flex"
          >
            <PanelLeft className="size-4 rotate-180" aria-hidden="true" />
          </button>
        )}

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {NAV.map((entry) =>
              isGroup(entry) ? (
                <li key={entry.label} className="pt-3 first:pt-0">
                  <NavGroupBlock
                    label={entry.label}
                    items={entry.items}
                    collapsed={collapsed}
                    isActive={isActive}
                  />
                </li>
              ) : (
                <li key={entry.href}>
                  <NavLink item={entry} collapsed={collapsed} active={isActive(entry.href)} />
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="shrink-0 border-t border-border px-3 py-3">
          <ul className="space-y-0.5">
            {NAV_FOOTER.map((item) => (
              <li key={item.href}>
                <NavLink item={item} collapsed={collapsed} active={isActive(item.href)} />
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <Avatar className="size-8 shrink-0">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
              <AvatarFallback className="bg-surface-raised text-caption font-medium text-muted">
                {initialsOf(profile.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                {/* User data renders verbatim — never snake_cased (§3.3b guardrail). */}
                <div className="truncate text-caption font-medium text-text">{profile.name}</div>
                <div className="truncate text-caption text-faint">{CURRENT_USER.email}</div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </TooltipProvider>
  )
}

function NavGroupBlock({
  label,
  items,
  collapsed,
  isActive,
}: {
  label: string
  items: NavItem[]
  collapsed: boolean
  isActive: (href: string) => boolean
}) {
  const [open, setOpen] = React.useState(true)

  if (collapsed) {
    return (
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} collapsed active={isActive(item.href)} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-1.5 text-muted transition-colors duration-150 hover:text-text">
        <SectionLabel>{label}</SectionLabel>
        <ChevronDown
          className={cn('size-3 transition-transform duration-150', !open && '-rotate-90')}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-0.5">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} collapsed={false} active={isActive(item.href)} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
