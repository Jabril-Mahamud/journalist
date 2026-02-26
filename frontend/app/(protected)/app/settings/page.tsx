'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser, useClerk } from '@clerk/nextjs'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TemplatesSection } from '@/components/templates-section'
import { Sun, Moon, Monitor, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/api'
import { useLocalStorage } from '@/hooks/use-local-storage'

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebar_collapsed', false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const { signOut } = useClerk()
  const api = useApi()

  // Todoist state
  const [todoistToken, setTodoistToken] = useState('')
  const [todoistConnected, setTodoistConnected] = useState(false)
  const [todoistLoading, setTodoistLoading] = useState(false)
  const [todoistChecking, setTodoistChecking] = useState(true)
  const [todoistError, setTodoistError] = useState<string | null>(null)
  const [todoistSuccess, setTodoistSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    api.getTodoistStatus()
      .then((s) => setTodoistConnected(s.connected))
      .catch(() => {})
      .finally(() => setTodoistChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  const handleSaveToken = async () => {
    if (!todoistToken.trim()) return
    setTodoistLoading(true)
    setTodoistError(null)
    setTodoistSuccess(false)
    try {
      await api.saveTodoistToken(todoistToken.trim())
      setTodoistConnected(true)
      setTodoistSuccess(true)
      setTodoistToken('')
      setTimeout(() => setTodoistSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect'
      setTodoistError(msg)
    } finally {
      setTodoistLoading(false)
    }
  }

  const handleDisconnect = async () => {
    const confirmed = window.confirm('Disconnect Todoist? Task links on entries will remain but tasks won\'t load until you reconnect.')
    if (!confirmed) return
    setTodoistLoading(true)
    try {
      await api.deleteTodoistToken()
      setTodoistConnected(false)
    } catch {
      // silent
    } finally {
      setTodoistLoading(false)
    }
  }

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
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-8 py-8">
            <Skeleton className="h-10 w-28 mb-8" />
            <div className="space-y-10">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-56" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-80" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
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

          <div className="space-y-10">

            {/* Appearance */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
              <div className="flex gap-2">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex-1',
                      theme === option.value && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <option.icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Templates</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage reusable entry templates.
                </p>
              </div>
              <TemplatesSection />
            </div>

            {/* Todoist integration */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Todoist</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Link your tasks to journal entries and complete them without leaving Journalist.
                </p>
              </div>

              {todoistChecking ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking connection…
                </div>
              ) : todoistConnected ? (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Todoist connected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={todoistLoading}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {todoistLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                      Not connected
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Paste your Todoist API token below. Find it in{' '}
                      <a
                        href="https://app.todoist.com/app/settings/integrations/developer"
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-foreground inline-flex items-center gap-0.5"
                      >
                        Todoist → Settings → Integrations → Developer
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      .
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Paste API token…"
                        value={todoistToken}
                        onChange={(e) => {
                          setTodoistToken(e.target.value)
                          setTodoistError(null)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveToken}
                        disabled={todoistLoading || !todoistToken.trim()}
                      >
                        {todoistLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    </div>
                    {todoistError && (
                      <p className="text-sm text-destructive">{todoistError}</p>
                    )}
                  </div>
                </div>
              )}

              {todoistSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Todoist connected successfully
                </p>
              )}
            </div>

            {/* Account */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground">
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