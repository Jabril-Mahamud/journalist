import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import type { Metadata } from 'next'
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google'
import "./globals.css";

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

const sourceSerif = Source_Serif_4({
  variable: '--font-serif',
  subsets: ['latin'],
  axes: ['opsz'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Journalist - Your Personal Journaling App',
  description: 'A beautiful journaling app to capture your thoughts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased`}
        >
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
