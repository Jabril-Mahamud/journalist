"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Home,
  Calendar,
  LayoutGrid,
  Settings,
  PenLine,
  Sun,
  Moon,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useUser, useClerk } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { icon: Home, label: "Today", href: "/app" },
  { icon: LayoutGrid, label: "All Entries", href: "/app/all" },
  { icon: Calendar, label: "Calendar", href: "/app/calendar" },
]

const SETTINGS_ITEM = { icon: Settings, label: "Settings", href: "/app/settings" }

function BrandMark() {
  return (
    <span className="w-8 h-8 rounded-[9px] bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7 9h6M7 13h6M7 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m15 15 5-5-2-2-5 5v2z" fill="currentColor" />
      </svg>
    </span>
  )
}

function SidebarContent({
  compact,
  mobile,
  onClose,
}: {
  compact: boolean
  mobile: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const { setTheme, resolvedTheme } = useTheme()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  const showLabel = !compact || mobile
  const isDark = mounted && resolvedTheme === "dark"

  const toggleTheme = () => {
    const isDarkNow = document.documentElement.classList.contains("dark")
    setTheme(isDarkNow ? "light" : "dark")
  }

  const handleNav = () => {
    if (mobile && onClose) onClose()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-2.5 px-3 pt-4 pb-3",
        compact && !mobile && "justify-center px-0"
      )}>
        <BrandMark />
        {showLabel && <span className="font-semibold text-[15px] tracking-tight">Journalist</span>}
      </div>

      {/* New entry button */}
      <div className={cn("px-3 mb-2", compact && !mobile && "px-2")}>
        <Link href="/app" onClick={handleNav}>
          <button className={cn(
            "flex items-center gap-2 w-full px-3 py-2.5 bg-primary text-primary-foreground rounded-[10px] text-[13.5px] font-semibold",
            "shadow-sm hover:brightness-105 active:translate-y-px transition-all",
            compact && !mobile && "justify-center px-2.5"
          )}>
            <PenLine className="h-[15px] w-[15px]" />
            {showLabel && <span>New entry</span>}
          </button>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 mt-1.5">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={handleNav}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-colors",
                "text-muted-foreground hover:bg-background hover:text-foreground",
                isActive && "bg-card text-foreground shadow-sm border border-border",
                compact && !mobile && "justify-center px-2.5"
              )}>
                <span className={cn("flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>
                  <item.icon className="h-[17px] w-[17px]" />
                </span>
                {showLabel && <span>{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-0.5 px-3 mb-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-colors",
            "text-muted-foreground hover:bg-background hover:text-foreground",
            compact && !mobile && "justify-center px-2.5"
          )}
        >
          <span className="flex-shrink-0 text-muted-foreground">
            {isDark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          </span>
          {showLabel && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>

        {/* Settings */}
        <Link href={SETTINGS_ITEM.href} onClick={handleNav}>
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13.5px] font-medium transition-colors",
            "text-muted-foreground hover:bg-background hover:text-foreground",
            pathname === SETTINGS_ITEM.href && "bg-card text-foreground shadow-sm border border-border",
            compact && !mobile && "justify-center px-2.5"
          )}>
            <span className={cn("flex-shrink-0", pathname === SETTINGS_ITEM.href ? "text-primary" : "text-muted-foreground")}>
              <Settings className="h-[17px] w-[17px]" />
            </span>
            {showLabel && <span>{SETTINGS_ITEM.label}</span>}
          </div>
        </Link>
      </div>

      {/* User row */}
      {user && (
        <div className={cn("px-3 pb-3 border-t border-border mt-1 pt-2", compact && !mobile && "px-2")}>
          <div className={cn(
            "flex items-center gap-2.5 px-2 py-2",
            compact && !mobile && "justify-center"
          )}>
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.firstName || "User"}
                width={30}
                height={30}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
              </div>
            )}
            {showLabel && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {user.primaryEmailAddress?.emailAddress}
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors flex-shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Mobile Top Bar ──────────────────────────────────────────────────────── */

function MobileTopBar({
  title,
  onMenuOpen,
}: {
  title: string
  onMenuOpen: () => void
}) {
  return (
    <header className="h-14 flex items-center gap-2.5 px-3 border-b border-border bg-background/88 backdrop-blur-md sticky top-0 z-10">
      <button
        onClick={onMenuOpen}
        className="w-[34px] h-[34px] flex items-center justify-center rounded-md text-foreground hover:bg-secondary transition-colors"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <div className="flex-1 text-center font-semibold text-base">{title}</div>
      <Link href="/app/all">
        <span className="w-[34px] h-[34px] flex items-center justify-center rounded-md text-foreground hover:bg-secondary transition-colors">
          <Search className="h-4 w-4" />
        </span>
      </Link>
    </header>
  )
}

/* ─── Mobile Tab Bar ──────────────────────────────────────────────────────── */

function MobileTabBar() {
  const pathname = usePathname()

  const tabs = [
    { icon: Home, label: "Today", href: "/app" },
    { icon: LayoutGrid, label: "Entries", href: "/app/all" },
    { type: "fab" as const },
    { icon: Calendar, label: "Calendar", href: "/app/calendar" },
    { icon: Settings, label: "Settings", href: "/app/settings" },
  ]

  return (
    <nav className="h-16 border-t border-border bg-card grid grid-cols-5 items-center pb-safe">
      {tabs.map((tab) => {
        if (tab.type === "fab") {
          return (
            <Link key="fab" href="/app" className="justify-self-center">
              <button className="w-11 h-11 bg-primary text-primary-foreground rounded-[14px] flex items-center justify-center shadow-md">
                <PenLine className="h-5 w-5" />
              </button>
            </Link>
          )
        }
        const isActive = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href!}>
            <div className={cn(
              "flex flex-col items-center gap-0.5 py-1.5 px-1 text-muted-foreground",
              isActive && "text-primary"
            )}>
              <tab.icon className="h-5 w-5" />
              <span className="text-[10.5px] font-medium">{tab.label}</span>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}

/* ─── Main Shell ──────────────────────────────────────────────────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  const pageTitle = React.useMemo(() => {
    if (pathname === "/app") return "Today"
    if (pathname === "/app/all") return "All Entries"
    if (pathname === "/app/calendar") return "Calendar"
    if (pathname === "/app/settings") return "Settings"
    return "Journalist"
  }, [pathname])

  React.useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 border-r border-border bg-sidebar flex-col transition-all duration-200">
        <SidebarContent compact={false} mobile={false} />
      </aside>

      {/* Tablet sidebar (768-1023px): compact icons only */}
      <aside className="hidden md:flex lg:hidden w-16 flex-shrink-0 border-r border-border bg-sidebar flex-col transition-all duration-200">
        <SidebarContent compact={true} mobile={false} />
      </aside>

      {/* Mobile drawer (< 768px) */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-sidebar z-50 shadow-2xl animate-in slide-in-from-left duration-250">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarContent compact={false} mobile={true} onClose={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden">
          <MobileTopBar title={pageTitle} onMenuOpen={() => setDrawerOpen(true)} />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Mobile bottom tab bar */}
        <div className="md:hidden">
          <MobileTabBar />
        </div>
      </main>
    </div>
  )
}

