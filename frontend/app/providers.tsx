'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes — journaling data rarely changes from external sources.
            // This eliminates the constant refetches when navigating between pages.
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes before GC
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            // Don't hammer the server on transient network blips
            retry: 1,
          },
        },
      })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}