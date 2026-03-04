"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ProjectCombobox } from "@/components/project-combobox"
import { StructuredEntryForm, StructuredEntryFormHandle } from "@/components/structured-entry-form"
import { useApi, TodoistTask, Template } from "@/lib/api"
import { useCreateEntry } from "@/lib/hooks/useEntries"
import { useTemplates } from "@/lib/hooks/useTemplates"
import { parseTemplate, defaultValues, assembleMarkdown } from "@/lib/template-parser"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Sparkles, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, startOfToday } from "date-fns"
import ReactMarkdown from "react-markdown"

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    project_names: z.array(z.string()),
})

// ─── Placeholder resolution ───────────────────────────────────────────────────

function resolveTemplatePlaceholders(content: string): string {
    const today = new Date()
    const date = today.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)) // Mon-first
    const weekStartStr = weekStart.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return content
        .replace(/\{\{date\}\}/g, date)
        .replace(/\{\{week_start\}\}/g, weekStartStr)
}

// ─── Task helpers ─────────────────────────────────────────────────────────────

function groupTasksForPicker(tasks: TodoistTask[]): {
    todayTasks: TodoistTask[]
    otherTasks: TodoistTask[]
} {
    const today = format(new Date(), "yyyy-MM-dd")
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

function formatTaskDue(due: TodoistTask["due"]): { label: string; overdue: boolean } | null {
    if (!due) return null
    const date = new Date(due.date + "T00:00:00")
    const today = startOfToday()
    const diff = Math.round((date.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, overdue: true }
    if (diff === 0) return { label: "Today", overdue: false }
    if (diff === 1) return { label: "Tomorrow", overdue: false }
    return { label: due.string, overdue: false }
}

// ─── Step 1: Template Picker ──────────────────────────────────────────────────

interface TemplatePickerProps {
    suggestions: Template[]
    allTemplates: Template[]
    isLoading: boolean
    onSelect: (template: Template | null) => void
}

function TemplatePicker({ suggestions, allTemplates, isLoading, onSelect }: TemplatePickerProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 py-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
            </div>
        )
    }

    const myTemplates = allTemplates.filter((t) => !t.is_built_in)
    const builtInTemplates = allTemplates.filter((t) => t.is_built_in)

    const TemplateCard = ({ template, badge }: { template: Template; badge?: string }) => (
        <button
            type="button"
            onClick={() => onSelect(template)}
            className="w-full text-left flex items-start gap-3 rounded-lg border px-4 py-3 hover:border-primary/50 hover:bg-accent/40 transition-colors"
        >
            {template.icon ? (
                <span className="text-xl shrink-0 mt-0.5">{template.icon}</span>
            ) : (
                <FileText className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                    {badge && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 bg-primary/5 rounded-md px-1.5 py-0.5 shrink-0">
                            <Sparkles className="h-3 w-3" />
                            {badge}
                        </span>
                    )}
                </div>
                {template.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {template.description}
                    </p>
                )}
            </div>
        </button>
    )

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={() => onSelect(null)}
                className="w-full text-left flex items-center gap-3 rounded-lg border border-dashed px-4 py-3 hover:border-primary/50 hover:bg-accent/40 transition-colors"
            >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                    <p className="text-sm font-medium">Blank entry</p>
                    <p className="text-xs text-muted-foreground">Start from scratch</p>
                </div>
            </button>

            {suggestions.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Suggested for now
                    </p>
                    {suggestions.map((t) => (
                        <TemplateCard key={t.id} template={t} badge="Suggested" />
                    ))}
                </div>
            )}

            {myTemplates.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        My templates
                    </p>
                    {myTemplates.map((t) => (
                        <TemplateCard key={t.id} template={t} />
                    ))}
                </div>
            )}

            {builtInTemplates.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Built-in templates
                    </p>
                    {builtInTemplates.map((t) => (
                        <TemplateCard key={t.id} template={t} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({
    task,
    checked,
    onToggle,
}: {
    task: TodoistTask
    checked: boolean
    onToggle: () => void
}) {
    const due = formatTaskDue(task.due)
    const id = `task-${task.id}`
    return (
        <div className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-muted/50">
            <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
            <Label
                htmlFor={id}
                className="flex flex-1 items-center justify-between gap-2 cursor-pointer font-normal"
            >
                <span className="text-sm leading-snug">{task.content}</span>
                <div className="flex items-center gap-2 shrink-0">
                    {due && (
                        <span className={cn(
                            "text-xs",
                            due.overdue ? "text-red-500" : "text-muted-foreground"
                        )}>
                            {due.label}
                        </span>
                    )}
                    {task.project_name && (
                        <Badge variant="secondary" className="text-xs font-normal px-1.5 py-0">
                            {task.project_name}
                        </Badge>
                    )}
                </div>
            </Label>
        </div>
    )
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface NewEntryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

type Step = 'pick-template' | 'write'

export function NewEntryDialog({ open, onOpenChange, onSuccess }: NewEntryDialogProps) {
    const [step, setStep] = React.useState<Step>('pick-template')
    const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null | undefined>(undefined)
    const [resolvedTemplateContent, setResolvedTemplateContent] = React.useState<string>('')
    const [templateValues, setTemplateValues] = React.useState<Record<string, string>>({})
    const [suggestions, setSuggestions] = React.useState<Template[]>([])
    const [suggestionsLoading, setSuggestionsLoading] = React.useState(false)

    const [todoistConnected, setTodoistConnected] = React.useState(false)
    const [todoistTasks, setTodoistTasks] = React.useState<TodoistTask[]>([])
    const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set())
    const [loadingTasks, setLoadingTasks] = React.useState(false)

    const structuredFormRef = React.useRef<StructuredEntryFormHandle>(null!)

    const api = useApi()
    const createEntryMutation = useCreateEntry()
    const { data: allTemplates = [], isLoading: templatesLoading } = useTemplates()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { title: "", content: "", project_names: [] },
    })

    const loadInitialData = async () => {
        setSuggestionsLoading(true)
        try {
            const [status, sugg] = await Promise.all([
                api.getTodoistStatus(),
                api.getTemplateSuggestions(),
            ])
            setSuggestions(sugg)
            setTodoistConnected(status.connected)
            if (status.connected) {
                setLoadingTasks(true)
                const tasks = await api.getTodoistTasks()
                setTodoistTasks(tasks)
            }
        } catch (error) {
            console.error("Error loading initial data:", error)
        } finally {
            setSuggestionsLoading(false)
            setLoadingTasks(false)
        }
    }

    React.useEffect(() => {
        if (open) {
            setStep('pick-template')
            setSelectedTemplate(undefined)
            setResolvedTemplateContent('')
            setTemplateValues({})
            form.reset()
            setSelectedTaskIds(new Set())
            loadInitialData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleTemplateSelect = (template: Template | null) => {
        setSelectedTemplate(template)
        if (template) {
            const resolved = resolveTemplatePlaceholders(template.content)
            setResolvedTemplateContent(resolved)
            const blocks = parseTemplate(resolved)
            setTemplateValues(defaultValues(blocks))
        } else {
            setResolvedTemplateContent('')
        }
        setStep('write')
    }

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev)
            if (next.has(taskId)) {
                next.delete(taskId)
            } else {
                next.add(taskId)
            }
            return next
        })
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        let content = values.content

        if (selectedTemplate) {
            const blocks = parseTemplate(resolvedTemplateContent || selectedTemplate.content)
            content = assembleMarkdown(blocks, templateValues)
            if (!content.trim()) {
                form.setError('content', { message: 'Please fill in at least one field' })
                return
            }
        }

        try {
            const newEntry = await createEntryMutation.mutateAsync({ ...values, content })
            for (const taskId of selectedTaskIds) {
                await api.linkTaskToEntry(newEntry.id, taskId)
            }
            form.reset()
            setSelectedTaskIds(new Set())
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error("Error creating entry:", error)
        }
    }

    const isStructured = !!selectedTemplate
    const templateBlocks = React.useMemo(
        () => (selectedTemplate ? parseTemplate(resolvedTemplateContent || selectedTemplate.content) : []),
        [selectedTemplate, resolvedTemplateContent]
    )
    const isLoading = templatesLoading || suggestionsLoading

    const { todayTasks, otherTasks } = React.useMemo(
        () => groupTasksForPicker(todoistTasks),
        [todoistTasks]
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {step === 'write' && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setStep('pick-template')}
                                className="shrink-0 -ml-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <DialogTitle className="text-2xl">
                                {step === 'pick-template'
                                    ? 'New Entry'
                                    : selectedTemplate?.name ?? 'New Entry'}
                            </DialogTitle>
                            <DialogDescription>
                                {step === 'pick-template'
                                    ? 'Choose a template or start blank'
                                    : 'Capture your thoughts and reflections'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {step === 'pick-template' && (
                    <TemplatePicker
                        suggestions={suggestions}
                        allTemplates={allTemplates}
                        isLoading={isLoading}
                        onSelect={handleTemplateSelect}
                    />
                )}

                {step === 'write' && (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Title */}
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="What's on your mind?"
                                                {...field}
                                                className="text-lg"
                                                autoFocus
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Content — structured or plain */}
                            {isStructured ? (
                                <div>
                                    <StructuredEntryForm
                                        blocks={templateBlocks}
                                        values={templateValues}
                                        onChange={setTemplateValues}
                                        formRef={structuredFormRef}
                                    />
                                </div>
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Content</FormLabel>
                                            <FormControl>
                                                <Tabs defaultValue="write" className="w-full">
                                                    <TabsList className="mb-2">
                                                        <TabsTrigger value="write">Write</TabsTrigger>
                                                        <TabsTrigger value="preview">Preview</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="write">
                                                        <Textarea
                                                            placeholder="Write your thoughts..."
                                                            className="min-h-[200px] text-base resize-none"
                                                            {...field}
                                                        />
                                                    </TabsContent>
                                                    <TabsContent value="preview">
                                                        <div className="min-h-[200px] p-4 border rounded-md prose dark:prose-invert max-w-none">
                                                            {field.value ? (
                                                                <ReactMarkdown>{field.value}</ReactMarkdown>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Nothing to preview</span>
                                                            )}
                                                        </div>
                                                    </TabsContent>
                                                </Tabs>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Projects */}
                            <FormField
                                control={form.control}
                                name="project_names"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Projects</FormLabel>
                                        <FormControl>
                                            <ProjectCombobox
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Type to add or search projects..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Todoist task linking */}
                            {todoistConnected && (loadingTasks || todoistTasks.length > 0) && (
                                <div className="space-y-2">
                                    <FormLabel>Tasks</FormLabel>
                                    <div className="border rounded-md overflow-hidden">
                                        {loadingTasks ? (
                                            <div className="px-3 py-3 text-sm text-muted-foreground">
                                                Loading tasks…
                                            </div>
                                        ) : (
                                            <div className="max-h-[220px] overflow-y-auto">
                                                {/* Today group */}
                                                {todayTasks.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 sticky top-0">
                                                            <span className="text-xs font-semibold text-primary">Today</span>
                                                            <Separator className="flex-1 bg-primary/20" />
                                                        </div>
                                                        {todayTasks.map((task) => (
                                                            <TaskItem
                                                                key={task.id}
                                                                task={task}
                                                                checked={selectedTaskIds.has(task.id)}
                                                                onToggle={() => toggleTask(task.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Upcoming group */}
                                                {otherTasks.length > 0 && (
                                                    <div>
                                                        {todayTasks.length > 0 && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 sticky top-0">
                                                                <span className="text-xs font-semibold text-muted-foreground">Upcoming</span>
                                                                <Separator className="flex-1" />
                                                            </div>
                                                        )}
                                                        {otherTasks.map((task) => (
                                                            <TaskItem
                                                                key={task.id}
                                                                task={task}
                                                                checked={selectedTaskIds.has(task.id)}
                                                                onToggle={() => toggleTask(task.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {todayTasks.length === 0 && otherTasks.length === 0 && (
                                                    <div className="px-3 py-3 text-sm text-muted-foreground">
                                                        No open tasks.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createEntryMutation.isPending}>
                                    {createEntryMutation.isPending ? "Creating..." : "Create Entry"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}