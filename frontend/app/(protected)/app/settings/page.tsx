'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser, useClerk } from '@clerk/nextjs'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const { signOut } = useClerk()

  useEffect(() => {
    setMounted(true)
  }, [])

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  if (!mounted) {
    return (
      <div className="flex h-screen">
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <h1 className="text-4xl font-bold mb-8">Settings</h1>

          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme
              </p>
              <div className="flex gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex-1',
                      theme === option.value &&
                        'bg-primary text-primary-foreground'
                    )}
                  >
                    <option.icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
              <Button variant="outline" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
