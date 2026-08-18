import type { Metadata } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// Outfit is the display/prose face: Black (900) for uppercase headings, Regular (400)
// for the one escape hatch where copy runs past two lines.
const display = Outfit({
  subsets: ['latin'],
  weight: ['400', '900'],
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
  description: 'Premier League ticketing account manager and resale inventory dashboard.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class on <html> before hydration.
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${mono.variable}`}>
      <body className="font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
