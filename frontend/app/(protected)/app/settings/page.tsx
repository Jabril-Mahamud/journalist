'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useUser, useClerk } from '@clerk/nextjs'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TemplatesSection } from '@/components/templates-section'
import { Sun, Moon, Monitor, CheckCircle2, Loader2, ExternalLink, LogOut, Download, Trash2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApi } from '@/lib/api'
import { usePreferences } from '@/lib/preferences'

const SETTING_TABS = [
  { id: 'account', label: 'Account' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'templates', label: 'Templates' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Data & privacy' },
] as const

type SettingsTab = (typeof SETTING_TABS)[number]['id']

function TodoistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="#e44332">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 6.5L11 12.5l6 4v2l-9-6V10l9-6v4.5z" />
    </svg>
  )
}

/* ─── Account Tab ─────────────────────────────────────────────────────────── */

function AccountTab() {
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[22px] font-medium tracking-tight mb-1">Account</h2>
        <p className="text-[13.5px] text-muted-foreground">Your sign-in details.</p>
      </div>

      <div className="flex items-center gap-3.5 p-4 bg-card border border-border rounded-[14px]">
        {user?.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={48} height={48} className="rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-lg font-semibold">
            {(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14.5px]">{user?.firstName} {user?.lastName}</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5 truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </div>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors self-start"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  )
}

/* ─── Integrations Tab ────────────────────────────────────────────────────── */

function IntegrationsTab() {
  const api = useApi()
  const [todoistToken, setTodoistToken] = useState('')
  const [todoistConnected, setTodoistConnected] = useState(false)
  const [todoistLoading, setTodoistLoading] = useState(false)
  const [todoistChecking, setTodoistChecking] = useState(true)
  const [todoistError, setTodoistError] = useState<string | null>(null)
  const [todoistSuccess, setTodoistSuccess] = useState(false)

  useEffect(() => {
    api.getTodoistStatus()
      .then((s) => setTodoistConnected(s.connected))
      .catch(() => {})
      .finally(() => setTodoistChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[22px] font-medium tracking-tight mb-1">Integrations</h2>
        <p className="text-[13.5px] text-muted-foreground max-w-[52ch]">
          Connect external tools to pull context into your journal.
        </p>
      </div>

      {/* Todoist */}
      <div className="border border-border rounded-[14px] bg-card overflow-hidden">
        <div className="flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-[11px] bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <TodoistIcon />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14.5px]">
              Todoist <span className="text-muted-foreground font-normal">— task sync</span>
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              {todoistChecking ? 'Checking…' : todoistConnected ? 'Connected' : 'Not connected'}
            </div>
          </div>
          {!todoistChecking && (
            <button
              onClick={todoistConnected ? handleDisconnect : undefined}
              disabled={todoistLoading}
              className={cn(
                "px-3.5 py-2 rounded-[10px] text-[13px] font-semibold transition-all",
                todoistConnected
                  ? "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  : "bg-primary text-primary-foreground hover:brightness-105"
              )}
            >
              {todoistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : todoistConnected ? 'Disconnect' : 'Connect'}
            </button>
          )}
        </div>

        {todoistConnected && (
          <>
            <div className="h-px bg-border" />
            <div className="px-4 py-2.5 text-[12.5px] text-muted-foreground">
              Tasks will appear in the sidebar and can be linked to entries.
            </div>
          </>
        )}

        {!todoistConnected && !todoistChecking && (
          <>
            <div className="h-px bg-border" />
            <div className="px-4 py-3 space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Paste your Todoist API token.{' '}
                <a
                  href="https://app.todoist.com/app/settings/integrations/developer"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-foreground inline-flex items-center gap-0.5"
                >
                  Find it here <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Paste API token…"
                  value={todoistToken}
                  onChange={(e) => { setTodoistToken(e.target.value); setTodoistError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                  className="flex-1 rounded-[10px]"
                />
                <button
                  onClick={handleSaveToken}
                  disabled={todoistLoading || !todoistToken.trim()}
                  className="px-3.5 py-2 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold hover:brightness-105 transition-all disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
              {todoistError && <p className="text-[13px] text-destructive">{todoistError}</p>}
            </div>
          </>
        )}
      </div>

      {todoistSuccess && (
        <p className="text-[13px] text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" /> Todoist connected successfully
        </p>
      )}

      {/* Placeholder integrations */}
      <div className="border border-border rounded-[14px] bg-card opacity-60">
        <div className="flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-[11px] bg-secondary flex items-center justify-center text-xl">📅</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14.5px]">
              Google Calendar <span className="text-muted-foreground font-normal">— coming soon</span>
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              Pull yesterday&apos;s events as memory cues.
            </div>
          </div>
          <button disabled className="px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted-foreground opacity-50">
            Join waitlist
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Templates Tab ───────────────────────────────────────────────────────── */

function TemplatesTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[22px] font-medium tracking-tight mb-1">Templates</h2>
        <p className="text-[13.5px] text-muted-foreground max-w-[52ch]">
          Reusable scaffolds for recurring entry types.
        </p>
      </div>
      <TemplatesSection />
    </div>
  )
}

/* ─── Appearance Tab ──────────────────────────────────────────────────────── */

function AppearanceTab() {
  const { prefs, setPrefs } = usePreferences()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => { setMounted(true) }, [])

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'Auto', icon: Monitor },
    { value: 'dark', label: 'Dark', icon: Moon },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[22px] font-medium tracking-tight mb-1">Appearance</h2>
        <p className="text-[13.5px] text-muted-foreground">Personalize tone, type, and density.</p>
      </div>

      {/* Mode picker */}
      <div className="bg-card border border-border rounded-[14px] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Mode</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <ModeOption
            active={prefs.mode !== 'focus'}
            onClick={() => setPrefs({ mode: 'default' })}
            name="Default"
            desc="Warm, editorial. Serif headers, soft cards."
            variant="default"
          />
          <ModeOption
            active={prefs.mode === 'focus'}
            onClick={() => setPrefs({ mode: 'focus' })}
            name="Focus"
            desc="Flat, productivity-first. Tighter list rhythm."
            variant="focus"
            badge="Todoist-style"
          />
        </div>
      </div>

        {/* Theme */}
        <div className="bg-card border border-border rounded-[14px] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Theme</div>
          {mounted && (
            <div className="inline-flex bg-secondary rounded-md p-0.5 gap-0.5">
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors",
                    theme === opt.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setTheme(opt.value)}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body font */}
        <div className="bg-card border border-border rounded-[14px] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">Body font</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'serif', label: 'Serif', style: 'font-serif' },
              { id: 'sans', label: 'Sans', style: 'font-sans' },
              { id: 'mono', label: 'Mono', style: 'font-mono' },
            ].map(f => (
              <button
                key={f.id}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-2 border rounded-[10px] text-[11px] font-medium transition-all",
                  "text-muted-foreground",
                  f.id === 'serif'
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-secondary hover:border-muted-foreground/30"
                )}
              >
                <span className={cn("text-lg text-foreground", f.style)}>Aa</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
  )
}

function ModeOption({
  active, onClick, name, desc, variant, badge,
}: {
  active: boolean; onClick: () => void; name: string; desc: string; variant: 'default' | 'focus'; badge?: string
}) {
  return (
    <button
      className={cn(
        "flex flex-col gap-2.5 p-2.5 border rounded-[10px] text-left transition-all",
        active ? "border-primary bg-primary/5" : "border-border bg-secondary hover:border-muted-foreground/30"
      )}
      onClick={onClick}
    >
      {/* Mini preview */}
      <div className={cn(
        "flex h-[70px] rounded-md overflow-hidden border border-border",
        variant === 'default' ? "bg-[#fbfaf7]" : "bg-white"
      )}>
        <div className={cn(
          "w-[30%] border-r p-1.5 flex flex-col gap-1",
          variant === 'default' ? "bg-[#f4f1ea] border-[#e8e2d6]" : "bg-[#f7f6f4] border-[#ececea]"
        )}>
          <span className="block h-[5px] rounded-sm bg-[#d8d0bf]" />
          <span className="block h-[5px] rounded-sm bg-[#d8d0bf]" />
          <span className={cn(
            "block h-[5px] rounded-sm",
            variant === 'default' ? "bg-primary/80" : "bg-[#dc4c3e]/20"
          )} />
          <span className="block h-[5px] rounded-sm bg-[#d8d0bf]" />
        </div>
        <div className="flex-1 p-2 flex flex-col gap-1">
          <span className={cn(
            "block rounded-sm",
            variant === 'default' ? "h-[9px] w-1/2 bg-[#1a1814]" : "h-[7px] w-[36%] bg-[#2a2620]"
          )} />
          {variant === 'default' ? (
            <>
              <div className="h-4 rounded bg-white border border-[#e8e2d6] relative mt-0.5">
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l" />
              </div>
              <span className="block h-2 w-[90%] rounded-sm bg-[#efeae0]" />
            </>
          ) : (
            <>
              <span className="block h-[6px] w-full rounded-sm bg-[#ececea]" />
              <span className="block h-[6px] w-full rounded-sm bg-[#ececea]" />
              <span className="block h-[6px] w-[60%] rounded-sm bg-[#ececea]" />
            </>
          )}
        </div>
      </div>

      <div>
        <div className="text-[13px] font-semibold flex items-center gap-1.5">
          {name}
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-px bg-secondary rounded-full text-muted-foreground inline-flex items-center gap-1">
              <TodoistIcon className="!w-2.5 !h-2.5" /> {badge}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{desc}</div>
      </div>
    </button>
  )
}

/* ─── Data Tab ────────────────────────────────────────────────────────────── */

function DataTab() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-serif text-[22px] font-medium tracking-tight mb-1">Data & privacy</h2>
        <p className="text-[13.5px] text-muted-foreground">Your entries are yours. Export anytime.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-[10px] opacity-60">
          <div>
            <div className="text-[13.5px] font-semibold">Export entries</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">All entries as JSON or Markdown</div>
          </div>
          <button disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold border border-border text-muted-foreground opacity-50 cursor-not-allowed">
            <Download className="h-3.5 w-3.5" /> Coming soon
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-[10px]">
          <div>
            <div className="text-[13.5px] font-semibold">Encryption</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Data encrypted at rest via TLS and server-side storage encryption</div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> server-side
          </span>
        </div>

        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-[10px] opacity-60">
          <div>
            <div className="text-[13.5px] font-semibold">Delete account</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Permanently remove all data</div>
          </div>
          <button disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold border border-border text-muted-foreground opacity-50 cursor-not-allowed">
            <Trash2 className="h-3.5 w-3.5" /> Coming soon
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Settings Page ───────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('appearance')
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="max-w-[980px] mx-auto px-7 py-8">
        <Skeleton className="h-10 w-28 mb-6" />
        <div className="grid md:grid-cols-[200px_1fr] gap-8">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-9 w-full rounded-[10px]" />
            <Skeleton className="h-9 w-full rounded-[10px]" />
            <Skeleton className="h-9 w-full rounded-[10px]" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-32 w-full rounded-[14px]" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[980px] mx-auto px-7 py-8 md:py-8 pb-6">
      <div className="mb-7">
        <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium tracking-tight leading-none">
          Settings
        </h1>
      </div>

      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        {/* Sidebar nav — horizontal tabs on mobile */}
        <nav className="flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible border-b md:border-b-0 pb-0 md:pb-0">
          {SETTING_TABS.map(t => (
            <button
              key={t.id}
              className={cn(
                "px-3 py-2 text-[13.5px] font-medium text-left whitespace-nowrap transition-all rounded-[10px]",
                "text-muted-foreground hover:text-foreground hover:bg-secondary",
                tab === t.id && "text-foreground bg-card border border-border shadow-sm",
                "md:w-full",
                // Mobile: bottom border tab style
                "md:rounded-[10px] rounded-none md:border-b-0",
                tab === t.id && "md:bg-card bg-transparent md:shadow-sm shadow-none md:border border-b-2 border-x-0 border-t-0 md:border border-primary"
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {tab === 'account' && <AccountTab />}
          {tab === 'integrations' && <IntegrationsTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'data' && <DataTab />}
        </div>
      </div>
    </div>
  )
}
