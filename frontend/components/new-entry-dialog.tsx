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
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, Sparkles, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    project_names: z.array(z.string()),
})

// ─── Step 1: Template Picker ──────────────────────────────────────────────────

interface TemplatePickerProps {
    suggestions: Template[]
    allTemplates: Template[]
    isLoading: boolean
    onSelect: (template: Template | null) => void
}

function TemplatePicker({
    suggestions,
    allTemplates,
    isLoading,
    onSelect,
}: TemplatePickerProps) {
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
            {/* Blank entry option */}
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

            {/* Suggested templates */}
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

            {/* My templates */}
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

            {/* Built-in templates */}
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

    // Reset everything when dialog opens
    React.useEffect(() => {
        if (open) {
            setStep('pick-template')
            setSelectedTemplate(undefined)
            setTemplateValues({})
            form.reset()
            setSelectedTaskIds(new Set())
            loadInitialData()
        }
    }, [open])

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

    const handleTemplateSelect = (template: Template | null) => {
        setSelectedTemplate(template)

        if (template) {
            const blocks = parseTemplate(template.content)
            setTemplateValues(defaultValues(blocks))
        }

        setStep('write')
    }

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev)
            next.has(taskId) ? next.delete(taskId) : next.add(taskId)
            return next
        })
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        let content = values.content

        // If using a structured template, assemble the content from field values
        if (selectedTemplate) {
            const blocks = parseTemplate(selectedTemplate.content)
            content = assembleMarkdown(blocks, templateValues)
            if (!content.trim()) {
                form.setError('content', { message: 'Please fill in at least one field' })
                return
            }
        }

        try {
            const newEntry = await createEntryMutation.mutateAsync({
                ...values,
                content,
            })
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

    // Derived state
    const isStructured = !!selectedTemplate
    const templateBlocks = React.useMemo(
        () => (selectedTemplate ? parseTemplate(selectedTemplate.content) : []),
        [selectedTemplate]
    )

    const isLoading = templatesLoading || suggestionsLoading

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
                                    : selectedTemplate
                                        ? selectedTemplate.name
                                        : 'New Entry'}
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
                            {todoistConnected && todoistTasks.length > 0 && (
                                <div className="space-y-3">
                                    <FormLabel>Link Tasks</FormLabel>
                                    <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
                                        {loadingTasks ? (
                                            <span className="text-muted-foreground text-sm">Loading tasks...</span>
                                        ) : (
                                            todoistTasks.map(task => (
                                                <label
                                                    key={task.id}
                                                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                                >
                                                    <Checkbox
                                                        checked={selectedTaskIds.has(task.id)}
                                                        onCheckedChange={() => toggleTask(task.id)}
                                                    />
                                                    <span className="text-sm flex-1">{task.content}</span>
                                                    {task.project_name && (
                                                        <span className="text-xs text-muted-foreground">{task.project_name}</span>
                                                    )}
                                                </label>
                                            ))
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