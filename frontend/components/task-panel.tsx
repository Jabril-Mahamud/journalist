"use client"

import * as React from "react"
import { useApi, TodoistTask, EntryTaskLink } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    CheckCircle2,
    Circle,
    ExternalLink,
    Loader2,
    Plus,
    Search,
    Unlink,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskPanelProps {
    entryId: number
}

const PRIORITY_COLOURS: Record<number, string> = {
    4: "text-red-500",
    3: "text-orange-500",
    2: "text-blue-500",
    1: "text-muted-foreground",
}

function priorityLabel(p: number) {
    return { 4: "P1", 3: "P2", 2: "P3", 1: "P4" }[p] ?? "P4"
}

function formatDue(due: TodoistTask["due"]) {
    if (!due) return null
    const date = new Date(due.date + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { label: "Today", overdue: false }
    if (diff === 1) return { label: "Tomorrow", overdue: false }
    return { label: due.string, overdue: false }
}

export function TaskPanel({ entryId }: TaskPanelProps) {
    const api = useApi()

    // Whether the panel is open
    const [open, setOpen] = React.useState(false)

    // All Todoist tasks (loaded once when panel opens)
    const [allTasks, setAllTasks] = React.useState<TodoistTask[]>([])
    const [linkedIds, setLinkedIds] = React.useState<Set<string>>(new Set())
    const [completedIds, setCompletedIds] = React.useState<Set<string>>(new Set())

    const [search, setSearch] = React.useState("")
    const [showPicker, setShowPicker] = React.useState(false)

    const [loading, setLoading] = React.useState(false)
    const [loadError, setLoadError] = React.useState<string | null>(null)
    const [notConnected, setNotConnected] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)

    // Load linked task IDs + all Todoist tasks when panel first opens
    React.useEffect(() => {
        if (!open) return
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    async function load() {
        setLoading(true)
        setLoadError(null)
        setNotConnected(false)
        try {
            const status = await api.getTodoistStatus()
            if (!status.connected) {
                setNotConnected(true)
                return
            }
            const [links, tasks] = await Promise.all([
                api.getEntryTasks(entryId),
                api.getTodoistTasks(),
            ])
            setLinkedIds(new Set(links.map((l: EntryTaskLink) => l.todoist_task_id)))
            setAllTasks(tasks)
        } catch {
            setLoadError("Failed to load tasks. Check your connection.")
        } finally {
            setLoading(false)
        }
    }

    // Tasks currently linked to this entry (and still in Todoist + not completed)
    const linkedTasks = allTasks.filter(
        (t) => linkedIds.has(t.id) && !completedIds.has(t.id)
    )

    // Tasks available to add (not yet linked, not completed)
    const pickerTasks = allTasks.filter(
        (t) =>
            !linkedIds.has(t.id) &&
            !completedIds.has(t.id) &&
            t.content.toLowerCase().includes(search.toLowerCase())
    )

    async function handleComplete(taskId: string) {
        setActionLoading(taskId)
        try {
            await api.closeTodoistTask(taskId)
            setCompletedIds((prev) => new Set([...prev, taskId]))
        } catch {
            // silent — could show a toast in a future iteration
        } finally {
            setActionLoading(null)
        }
    }

    async function handleLink(taskId: string) {
        setActionLoading(taskId)
        try {
            await api.linkTaskToEntry(entryId, taskId)
            setLinkedIds((prev) => new Set([...prev, taskId]))
            setShowPicker(false)
            setSearch("")
        } catch {
            // silent
        } finally {
            setActionLoading(null)
        }
    }

    async function handleUnlink(taskId: string) {
        setActionLoading(taskId)
        try {
            await api.unlinkTaskFromEntry(entryId, taskId)
            setLinkedIds((prev) => {
                const next = new Set(prev)
                next.delete(taskId)
                return next
            })
        } catch {
            // silent
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="border-t pt-4 mt-2">
            {/* Header */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
                <span className="flex items-center gap-2">
                    <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-red-500"
                        fill="currentColor"
                        aria-hidden
                    >
                        <path d="M21.155 3.43a1.5 1.5 0 0 1 .345.96v11.22a1.5 1.5 0 0 1-.345.96l-1.5 1.8a1.5 1.5 0 0 1-1.155.54H5.5a1.5 1.5 0 0 1-1.155-.54l-1.5-1.8A1.5 1.5 0 0 1 2.5 15.61V4.39a1.5 1.5 0 0 1 .345-.96l1.5-1.8A1.5 1.5 0 0 1 5.5 1.17h13c.45 0 .87.2 1.155.54l1.5 1.72zM12 5.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm1.5-3.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
                    </svg>
                    Todoist Tasks
                    {linkedTasks.length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs">
                            {linkedTasks.length}
                        </span>
                    )}
                </span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading tasks…
                        </div>
                    )}

                    {/* Not connected */}
                    {!loading && notConnected && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground py-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-orange-500" />
                            <span>
                                Connect Todoist in{" "}
                                <a
                                    href="/app/settings"
                                    className="underline text-foreground"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Settings
                                </a>{" "}
                                to link tasks.
                            </span>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && loadError && (
                        <div className="flex items-center gap-2 text-sm text-destructive py-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {loadError}
                        </div>
                    )}

                    {/* Linked tasks list */}
                    {!loading && !notConnected && !loadError && (
                        <>
                            {linkedTasks.length === 0 && !showPicker && (
                                <p className="text-sm text-muted-foreground py-1">
                                    No tasks linked yet.
                                </p>
                            )}

                            {linkedTasks.map((task) => {
                                const due = formatDue(task.due)
                                const busy = actionLoading === task.id
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-start gap-2 group py-1"
                                    >
                                        {/* Complete button */}
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => handleComplete(task.id)}
                                            className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-40"
                                            title="Complete task"
                                        >
                                            {busy ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Circle className="h-4 w-4" />
                                            )}
                                        </button>

                                        {/* Task content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm leading-snug">{task.content}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {task.project_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {task.project_name}
                                                    </span>
                                                )}
                                                {due && (
                                                    <span
                                                        className={cn(
                                                            "text-xs",
                                                            due.overdue
                                                                ? "text-red-500"
                                                                : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {due.label}
                                                    </span>
                                                )}
                                                <span
                                                    className={cn(
                                                        "text-xs font-medium",
                                                        PRIORITY_COLOURS[task.priority]
                                                    )}
                                                >
                                                    {priorityLabel(task.priority)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions (show on hover) */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            {task.url && (
                                                <a
                                                    href={task.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                                                    title="Open in Todoist"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            )}
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handleUnlink(task.id)}
                                                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                                                title="Remove from entry"
                                            >
                                                <Unlink className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Completed inline feedback */}
                            {completedIds.size > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pt-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {completedIds.size} task{completedIds.size > 1 ? "s" : ""} completed
                                </div>
                            )}

                            {/* Task picker */}
                            {showPicker ? (
                                <div className="border rounded-md mt-2 overflow-hidden">
                                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <Input
                                            autoFocus
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search your tasks…"
                                            className="h-7 border-0 p-0 shadow-none focus-visible:ring-0 text-sm"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => {
                                                setShowPicker(false)
                                                setSearch("")
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>

                                    <ul className="max-h-52 overflow-y-auto divide-y">
                                        {pickerTasks.length === 0 && (
                                            <li className="px-3 py-3 text-sm text-muted-foreground">
                                                {search ? "No matching tasks" : "All your tasks are already linked"}
                                            </li>
                                        )}
                                        {pickerTasks.map((task) => {
                                            const busy = actionLoading === task.id
                                            const due = formatDue(task.due)
                                            return (
                                                <li key={task.id}>
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => handleLink(task.id)}
                                                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-start gap-2 disabled:opacity-50"
                                                    >
                                                        {busy ? (
                                                            <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5 text-muted-foreground" />
                                                        ) : (
                                                            <Circle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="text-sm truncate">{task.content}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {task.project_name && (
                                                                    <span className="text-xs text-muted-foreground truncate">
                                                                        {task.project_name}
                                                                    </span>
                                                                )}
                                                                {due && (
                                                                    <span
                                                                        className={cn(
                                                                            "text-xs shrink-0",
                                                                            due.overdue ? "text-red-500" : "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {due.label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-1 text-muted-foreground"
                                    onClick={() => setShowPicker(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add task
                                </Button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}