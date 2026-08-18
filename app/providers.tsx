'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, useTheme } from 'next-themes'
import { Toaster } from 'sonner'
import { LocaleProvider } from '@/lib/format/LocaleProvider'
import { PrivacyProvider } from '@/components/domain/PrivacyToggle'

function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      closeButton
      richColors
    />
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; created lazily so it is never shared across requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <LocaleProvider>
          <PrivacyProvider>
            {children}
            <ThemedToaster />
          </PrivacyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
