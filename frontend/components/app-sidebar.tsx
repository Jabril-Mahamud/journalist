"use client"

import * as React from "react"
import { Calendar, Home, Settings, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function AppSidebar({
    isCollapsed,
    onToggle
}: {
    isCollapsed: boolean
    onToggle: () => void
}) {
    const menuItems = [
        { icon: Home, label: "Today", href: "/" },
        { icon: Calendar, label: "Calendar", href: "/calendar" },
        { icon: LayoutGrid, label: "All Entries", href: "/all" },
    ]

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
                {menuItems.map((item) => (
                    <Button
                        key={item.label}
                        variant="ghost"
                        className={`w-full ${isCollapsed ? "justify-center px-2" : "justify-start"}`}
                        size={isCollapsed ? "icon" : "default"}
                    >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </Button>
                ))}
            </nav>

            <Separator />

            <div className="p-2">
                <Button
                    variant="ghost"
                    className={`w-full ${isCollapsed ? "justify-center px-2" : "justify-start"}`}
                    size={isCollapsed ? "icon" : "default"}
                >
                    <Settings className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">Settings</span>}
                </Button>
            </div>
        </div>
    )
}