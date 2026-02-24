"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Calendar, Home, Settings, ChevronLeft, ChevronRight, LayoutGrid, Sun, Moon, LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import { useUser, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function AppSidebar({
    isCollapsed,
    onToggle
}: {
    isCollapsed: boolean
    onToggle: () => void
}) {
    const pathname = usePathname()
    const { setTheme, resolvedTheme } = useTheme()
    const { user } = useUser()
    const { signOut } = useClerk()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const menuItems = [
        { icon: Home, label: "Today", href: "/app" },
        { icon: Calendar, label: "Calendar", href: "/app/calendar" },
        { icon: LayoutGrid, label: "All Entries", href: "/app/all" },
    ]

    const settingsItem = { icon: Settings, label: "Settings", href: "/app/settings" }

    // Read directly from the DOM — this is what next-themes actually controls,
    // so it's always accurate regardless of React state / hydration timing.
    const toggleTheme = () => {
        const isDarkNow = document.documentElement.classList.contains("dark")
        setTheme(isDarkNow ? "light" : "dark")
    }

    // resolvedTheme only for icon/label — gated on mounted to avoid hydration mismatch
    const isDark = mounted && resolvedTheme === "dark"

    return (
        <div
            className={`${isCollapsed ? "w-16" : "w-64"
                } border-r bg-background transition-all duration-300 flex flex-col h-screen`}
        >
            <div className="p-4 flex items-center justify-between">
                {!isCollapsed && <h2 className="text-xl font-bold">Journalist</h2>}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onToggle}
                    className="ml-auto"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            <Separator />

            <nav className="flex-1 p-2 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link key={item.label} href={item.href}>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full",
                                    isCollapsed ? "justify-center px-2" : "justify-start",
                                    isActive && "bg-accent"
                                )}
                                size={isCollapsed ? "icon" : "default"}
                            >
                                <item.icon className="h-5 w-5" />
                                {!isCollapsed && <span className="ml-3">{item.label}</span>}
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            <Separator />

            <div className="p-2 space-y-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full",
                        isCollapsed ? "justify-center px-2" : "justify-start"
                    )}
                    size={isCollapsed ? "icon" : "default"}
                    onClick={toggleTheme}
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {!isCollapsed && (
                        <span className="ml-3">{isDark ? "Light mode" : "Dark mode"}</span>
                    )}
                </Button>

                <Link href={settingsItem.href}>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full",
                            isCollapsed ? "justify-center px-2" : "justify-start",
                            pathname === settingsItem.href && "bg-accent"
                        )}
                        size={isCollapsed ? "icon" : "default"}
                    >
                        <Settings className="h-5 w-5" />
                        {!isCollapsed && <span className="ml-3">Settings</span>}
                    </Button>
                </Link>
            </div>

            {user && (
                <>
                    <Separator />
                    <div className="p-2">
                        <div
                            className={cn(
                                "flex items-center gap-3 rounded-md p-2",
                                isCollapsed && "justify-center"
                            )}
                        >
                            {user.imageUrl ? (
                                <Image
                                    src={user.imageUrl}
                                    alt={user.firstName || "User"}
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {user.primaryEmailAddress?.emailAddress}
                                    </p>
                                </div>
                            )}
                            {!isCollapsed && (
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => signOut()}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}