import type { Metadata } from 'next'
import { JetBrains_Mono, Outfit, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Space Grotesk Bold (700) is the display face: page titles, section headings, KPI
// values, the wordmark. It replaced Outfit Black, whose O, D, G and S are near-circular
// and at 900 read playful rather than technical — a fight the terminal grammar was
// always going to lose. Cut terminals and a squarer S sit beside JetBrains Mono as a
// sibling rather than a guest. One weight: nothing here is ever not-bold.
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// Outfit stays for ONE job: multi-line prose, at 400. Mono is unreadable in paragraphs
// and a display face is not built for them either. 900 is gone — nothing renders it any
// more, and an unused weight is a font file the browser downloads for nothing.
const prose = Outfit({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-outfit',
  display: 'swap',
})

// JetBrains Mono is the DEFAULT UI font — nav, tables, chips, buttons, captions.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fetch.io',
  description: 'Premier League ticketing account manager, seat inventory and ballot automation.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class on <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${prose.variable} ${mono.variable}`}
    >
      <body className="font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
