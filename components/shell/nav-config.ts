import {
  BarChart3,
  Dices,
  History,
  Key,
  LifeBuoy,
  Link2,
  Mail,
  MessageSquare,
  Monitor,
  Settings,
  Shield,
  Ticket,
  type LucideIcon,
} from 'lucide-react'

/**
 * The sidebar tree from §4, in order. Labels are written normally here and
 * lower_snake_cased at render time by `snake()` — the grammar lives in one place.
 *
 * §9 rule 4: no two nav icons look alike.
 */

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Opens outside the app; renders a trailing external-link glyph. */
  external?: boolean
  /** Marks a route that is honestly not built yet. */
  soon?: boolean
}

export interface NavGroup {
  /** Rendered as a `// section_label` header, and as a collapsible group. */
  label: string
  items: NavItem[]
}

export type NavEntry = NavItem | NavGroup

export function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

export const NAV: NavEntry[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Monitor },
  {
    label: 'Accounts',
    items: [
      { label: 'Account Manager', href: '/accounts', icon: Key },
      { label: 'Proxies', href: '/accounts?tab=proxies', icon: Shield },
      { label: 'Email IMAP', href: '/accounts?tab=imap', icon: Mail },
      { label: 'OTP Inbox', href: '/accounts?tab=otp', icon: MessageSquare },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'My Tickets', href: '/mytickets', icon: Ticket },
      { label: 'My Links', href: '/mylinks', icon: Link2, soon: true },
    ],
  },
  {
    label: 'Ballots',
    items: [
      // §9 rule 4 — no two nav icons look alike. A ballot is a draw, so `Dices`; a run
      // history is a log, so `History`. Deliberately neither the calendar nor the clock
      // this group replaces, which read as "when" rather than "what happened".
      { label: 'Ballot Entries', href: '/ballots', icon: Dices },
      { label: 'Run History', href: '/ballots?tab=runs', icon: History },
    ],
  },
  { label: 'Insights', href: '/insights', icon: BarChart3, soon: true },
]

/** Pinned below a divider at the foot of the rail. */
export const NAV_FOOTER: NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help Support', href: 'https://fetch.io/help', icon: LifeBuoy, external: true },
]

/** Static until auth lands (Part 3+). */
export const CURRENT_USER = {
  name: 'Julien Moreau',
  email: 'j.moreau@mail.com',
  initials: 'JM',
}
