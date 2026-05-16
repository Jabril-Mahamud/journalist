'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser, useClerk } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TemplatesSection } from '@/components/templates-section'
import { Sun, Moon, Monitor, CheckCircle2, XCircle, Loader2, ExternalLink, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/api'

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user } = useUser()
  const { signOut } = useClerk()
  const api = useApi()

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
      <div className="max-w-[760px] mx-auto px-7 py-8 md:px-7 px-4.5">
        <Skeleton className="h-10 w-28 mb-6" />
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-[10px]" />
              <Skeleton className="h-10 flex-1 rounded-[10px]" />
              <Skeleton className="h-10 flex-1 rounded-[10px]" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-12 w-full rounded-[14px]" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-12 w-full rounded-[14px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto px-7 py-8 md:py-8 pb-6">
      {/* Header */}
      <div className="mb-7">
        <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium tracking-tight leading-none">
          Settings
        </h1>
      </div>

      <div className="flex flex-col gap-8">

        {/* Appearance */}
        <section className="bg-card border border-border rounded-[14px] p-4 md:p-5">
          <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Appearance
          </h2>
          <p className="text-[13.5px] text-muted-foreground mb-4">Choose your preferred theme</p>
          <div className="flex gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-[13.5px] font-semibold transition-all border',
                  theme === option.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Templates */}
        <section className="bg-card border border-border rounded-[14px] p-4 md:p-5">
          <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Templates
          </h2>
          <p className="text-[13.5px] text-muted-foreground mb-4">
            Create and manage reusable entry templates.
          </p>
          <TemplatesSection />
        </section>

        {/* Todoist integration */}
        <section className="bg-card border border-border rounded-[14px] p-4 md:p-5">
          <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Todoist
          </h2>
          <p className="text-[13.5px] text-muted-foreground mb-4">
            Link your tasks to journal entries and complete them without leaving Journalist.
          </p>

          {todoistChecking ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : todoistConnected ? (
            <div className="flex items-center justify-between rounded-[10px] border border-border px-4 py-3">
              <div className="flex items-center gap-2 text-[13.5px]">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-semibold">Todoist connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={todoistLoading}
                className="text-[13px] font-medium text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              >
                {todoistLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </button>
            </div>
          ) : (
            <div className="rounded-[10px] border border-border px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <XCircle className="h-4 w-4" />
                Not connected
              </div>
              <p className="text-[13px] text-muted-foreground">
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
                  className="flex-1 rounded-[10px]"
                />
                <button
                  onClick={handleSaveToken}
                  disabled={todoistLoading || !todoistToken.trim()}
                  className="px-3.5 py-2 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold hover:brightness-105 active:translate-y-px transition-all disabled:opacity-50"
                >
                  {todoistLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </button>
              </div>
              {todoistError && (
                <p className="text-[13px] text-destructive">{todoistError}</p>
              )}
            </div>
          )}

          {todoistSuccess && (
            <p className="text-[13px] text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-3">
              <CheckCircle2 className="h-4 w-4" />
              Todoist connected successfully
            </p>
          )}
        </section>

        {/* Account */}
        <section className="bg-card border border-border rounded-[14px] p-4 md:p-5">
          <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Account
          </h2>
          <p className="text-[13.5px] text-muted-foreground mb-4">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </section>

      </div>
    </div>
  )
}