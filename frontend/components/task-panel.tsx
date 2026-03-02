"use client"

import * as React from "react"
import { useApi, TodoistTask, EntryTaskLink } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addDays, startOfToday } from "date-fns"

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskPanelProps {
    entryId: number
}

// ─── Priority colours ────────────────────────────────────────────────────────

const PRIORITY_COLOURS: Record<number, string> = {
    4: "text-red-500",
    3: "text-orange-500",
    2: "text-blue-500",
    1: "text-muted-foreground",
}

function priorityLabel(p: number) {
    return { 4: "P1", 3: "P2", 2: "P3", 1: "P4" }[p] ?? "P4"
}

// ─── Due-date helpers ────────────────────────────────────────────────────────

function todayStr() {
    return format(new Date(), "yyyy-MM-dd")
}

function formatDue(due: TodoistTask["due"]): { label: string; overdue: boolean } | null {
    if (!due) return null
    const date = new Date(due.date + "T00:00:00")
    const today = startOfToday()
    const diffMs = date.getTime() - today.getTime()
    const diff = Math.round(diffMs / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { label: "Today", overdue: false }
    if (diff === 1) return { label: "Tomorrow", overdue: false }
    return { label: due.string, overdue: false }
}

// ─── Sorting utility ─────────────────────────────────────────────────────────

function groupTasks(tasks: TodoistTask[]): {
    todayTasks: TodoistTask[]
    otherTasks: TodoistTask[]
} {
    const today = todayStr()
    const todayTasks = tasks
        .filter((t) => t.due?.date === today)
        .sort((a, b) => a.content.localeCompare(b.content))
    const otherTasks = tasks
        .filter((t) => t.due?.date !== today)
        .sort((a, b) => {
            if (!a.due && !b.due) return a.content.localeCompare(b.content)
            if (!a.due) return 1
            if (!b.due) return -1
            return a.due.date.localeCompare(b.due.date)
        })
    return { todayTasks, otherTasks }
}

// ─── Reschedule Popover ──────────────────────────────────────────────────────

interface ReschedulePopoverProps {
    taskId: string
    isBusy: boolean
    onReschedule: (taskId: string, date: string) => Promise<void>
}

function ReschedulePopover({ taskId, isBusy, onReschedule }: ReschedulePopoverProps) {
    const [open, setOpen] = React.useState(false)
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>()
    const [localBusy, setLocalBusy] = React.useState(false)
    const [showCalendar, setShowCalendar] = React.useState(false)

    const busy = isBusy || localBusy

    async function pick(date: string) {
        setLocalBusy(true)
        try {
            await onReschedule(taskId, date)
            setOpen(false)
            setSelectedDate(undefined)
            setShowCalendar(false)
        } finally {
            setLocalBusy(false)
        }
    }

    const quickPicks = [
        { label: "Today", date: format(new Date(), "yyyy-MM-dd") },
        { label: "Tomorrow", date: format(addDays(new Date(), 1), "yyyy-MM-dd") },
        { label: "Next week", date: format(addDays(new Date(), 7), "yyyy-MM-dd") },
    ]

    return (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowCalendar(false) }}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    className="h-7 w-7 text-muted-foreground"
                    title="Reschedule task"
                >
                    {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <CalendarDays className="h-3.5 w-3.5" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
                {!showCalendar ? (
                    <>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                            Reschedule to…
                        </p>
                        <div className="space-y-0.5">
                            {quickPicks.map((p) => (
                                <Button
                                    key={p.label}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => pick(p.date)}
                                    className="w-full justify-start text-sm font-normal"
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </div>
                        <Separator className="my-2" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-sm font-normal text-muted-foreground"
                            onClick={() => setShowCalendar(true)}
                        >
                            <CalendarDays className="h-3.5 w-3.5 mr-2" />
                            Pick a date…
                        </Button>
                    </>
                ) : (
                    <>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < startOfToday()}
                            initialFocus
                        />
                        <div className="flex justify-end gap-2 pt-1 border-t mt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCalendar(false)}
                            >
                                Back
                            </Button>
                            <Button
                                size="sm"
                                disabled={!selectedDate || busy}
                                onClick={() => selectedDate && pick(format(selectedDate, "yyyy-MM-dd"))}
                            >
                                Set
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
    task: TodoistTask
    isLinked: boolean
    actionLoading: string | null
    onComplete: (id: string) => void
    onReschedule: (id: string, date: string) => Promise<void>
    onLink: (id: string) => void
    onUnlink: (id: string) => void
}

function TaskRow({
    task,
    isLinked,
    actionLoading,
    onComplete,
    onReschedule,
    onLink,
    onUnlink,
}: TaskRowProps) {
    const due = formatDue(task.due)
    const busy = actionLoading === task.id

    return (
        <div className="flex items-start gap-2 group py-1">
            {/* Complete */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                onClick={() => onComplete(task.id)}
                className="mt-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-green-500"
                title="Complete task"
            >
                {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Circle className="h-4 w-4" />
                )}
            </Button>

            {/* Content */}
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
                                due.overdue ? "text-red-500" : "text-muted-foreground"
                            )}
                        >
                            {due.label}
                        </span>
                    )}
                    <span className={cn("text-xs font-medium", PRIORITY_COLOURS[task.priority])}>
                        {priorityLabel(task.priority)}
                    </span>
                </div>
            </div>

            {/* Hover actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <ReschedulePopover
                    taskId={task.id}
                    isBusy={busy}
                    onReschedule={onReschedule}
                />

                {task.url && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        asChild
                    >
                        <a
                            href={task.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in Todoist"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                )}

                {isLinked ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => onUnlink(task.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Remove from entry"
                    >
                        <Unlink className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => onLink(task.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        title="Link to entry"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── TaskPanel ────────────────────────────────────────────────────────────────

export function TaskPanel({ entryId }: TaskPanelProps) {
    const api = useApi()
    const [open, setOpen] = React.useState(false)
    const [allTasks, setAllTasks] = React.useState<TodoistTask[]>([])
    const [linkedIds, setLinkedIds] = React.useState<Set<string>>(new Set())
    const [completedIds, setCompletedIds] = React.useState<Set<string>>(new Set())
    const [search, setSearch] = React.useState("")
    const [showPicker, setShowPicker] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [loadError, setLoadError] = React.useState<string | null>(null)
    const [notConnected, setNotConnected] = React.useState(false)
    const [actionLoading, setActionLoading] = React.useState<string | null>(null)

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

    const visibleTasks = allTasks.filter((t) => !completedIds.has(t.id))
    const { todayTasks, otherTasks } = groupTasks(visibleTasks)
    const pickerTasks = visibleTasks.filter(
        (t) =>
            !linkedIds.has(t.id) &&
            t.content.toLowerCase().includes(search.toLowerCase())
    )

    async function handleComplete(taskId: string) {
        setActionLoading(taskId)
        setCompletedIds((prev) => new Set([...prev, taskId]))
        try {
            await api.closeTodoistTask(taskId)
        } catch {
            setCompletedIds((prev) => {
                const next = new Set(prev)
                next.delete(taskId)
                return next
            })
        } finally {
            setActionLoading(null)
        }
    }

    async function handleReschedule(taskId: string, dueDate: string): Promise<void> {
        setActionLoading(taskId)
        setAllTasks((prev) =>
            prev.map((t) =>
                t.id === taskId
                    ? {
                          ...t,
                          due: t.due
                              ? { ...t.due, date: dueDate }
                              : { date: dueDate, string: dueDate, is_recurring: false },
                      }
                    : t
            )
        )
        try {
            await api.rescheduleTask(taskId, dueDate)
        } catch {
            load()
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

    const totalVisible = todayTasks.length + otherTasks.length

    return (
        <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-4 mt-2">
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center justify-between w-full px-0 h-auto text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-transparent"
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
                        {totalVisible > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {totalVisible}
                            </Badge>
                        )}
                    </span>
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-3 space-y-1">
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading tasks…
                    </div>
                )}

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
                            to view and manage tasks.
                        </span>
                    </div>
                )}

                {!loading && loadError && (
                    <div className="flex items-center gap-2 text-sm text-destructive py-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {loadError}
                    </div>
                )}

                {!loading && !notConnected && !loadError && (
                    <>
                        {totalVisible === 0 && !showPicker && (
                            <p className="text-sm text-muted-foreground py-1">No open tasks.</p>
                        )}

                        {/* Today section */}
                        {todayTasks.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 py-1.5">
                                    <span className="text-xs font-semibold text-primary">Today</span>
                                    <Separator className="flex-1 bg-primary/20" />
                                </div>
                                {todayTasks.map((task) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isLinked={linkedIds.has(task.id)}
                                        actionLoading={actionLoading}
                                        onComplete={handleComplete}
                                        onReschedule={handleReschedule}
                                        onLink={handleLink}
                                        onUnlink={handleUnlink}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Upcoming section */}
                        {otherTasks.length > 0 && (
                            <div className={cn(todayTasks.length > 0 && "mt-2")}>
                                {todayTasks.length > 0 && (
                                    <div className="flex items-center gap-2 py-1.5">
                                        <span className="text-xs font-semibold text-muted-foreground">
                                            Upcoming
                                        </span>
                                        <Separator className="flex-1" />
                                    </div>
                                )}
                                {otherTasks.map((task) => (
                                    <TaskRow
                                        key={task.id}
                                        task={task}
                                        isLinked={linkedIds.has(task.id)}
                                        actionLoading={actionLoading}
                                        onComplete={handleComplete}
                                        onReschedule={handleReschedule}
                                        onLink={handleLink}
                                        onUnlink={handleUnlink}
                                    />
                                ))}
                            </div>
                        )}

                        {completedIds.size > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 pt-2">
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
                                        size="sm"
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
                                            {search ? "No matching tasks" : "All tasks are already linked"}
                                        </li>
                                    )}
                                    {pickerTasks.map((task) => {
                                        const isBusy = actionLoading === task.id
                                        const due = formatDue(task.due)
                                        return (
                                            <li key={task.id}>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    disabled={isBusy}
                                                    onClick={() => handleLink(task.id)}
                                                    className="w-full justify-start px-3 py-2 h-auto rounded-none font-normal"
                                                >
                                                    {isBusy ? (
                                                        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                    )}
                                                    <div className="min-w-0 ml-2 text-left">
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
                                                                        due.overdue
                                                                            ? "text-red-500"
                                                                            : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {due.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Button>
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
                                Link a task
                            </Button>
                        )}
                    </>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}