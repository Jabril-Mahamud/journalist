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
import { TaskPanel } from "@/components/task-panel"
import { useApi, JournalEntry, TodoistTask } from "@/lib/api"
import { useUpdateEntry, useDeleteEntry } from "@/lib/hooks/useEntries"
import { Pencil, Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { getReadableTextColor } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    project_names: z.array(z.string()),
})

interface EntryDialogProps {
    entry: JournalEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function EntryDialog({ entry, open, onOpenChange, onUpdate }: EntryDialogProps) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [todoistConnected, setTodoistConnected] = React.useState(false)
    const [todoistTasks, setTodoistTasks] = React.useState<TodoistTask[]>([])
    const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set())
    const [loadingTasks, setLoadingTasks] = React.useState(false)
    const api = useApi()
    const updateEntryMutation = useUpdateEntry()
    const deleteEntryMutation = useDeleteEntry()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            project_names: [],
        },
    })

    const loadTodoistData = async () => {
        try {
            const status = await api.getTodoistStatus()
            setTodoistConnected(status.connected)
            if (status.connected) {
                setLoadingTasks(true)
                const tasks = await api.getTodoistTasks()
                setTodoistTasks(tasks)
            }
        } catch (error) {
            console.error("Error loading Todoist status:", error)
        } finally {
            setLoadingTasks(false)
        }
    }

    const loadLinkedTasks = async () => {
        if (!entry) return
        try {
            const links = await api.getEntryTasks(entry.id)
            setSelectedTaskIds(new Set(links.map(l => l.todoist_task_id)))
        } catch (error) {
            console.error("Error loading linked tasks:", error)
        }
    }

    React.useEffect(() => {
        if (open && isEditing) {
            loadTodoistData()
        }
    }, [open, isEditing, loadTodoistData])

    React.useEffect(() => {
        if (entry) {
            form.reset({
                title: entry.title,
                content: entry.content,
                project_names: entry.projects.map(p => p.name),
            })
            if (isEditing) {
                loadLinkedTasks()
            }
        }
        setIsEditing(false)
        setSelectedTaskIds(new Set())
    }, [entry, form, isEditing, loadLinkedTasks])

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

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!entry) return
        try {
            await updateEntryMutation.mutateAsync({ id: entry.id, data: values })
            const currentLinks = await api.getEntryTasks(entry.id)
            const currentIds = new Set(currentLinks.map(l => l.todoist_task_id))
            for (const taskId of selectedTaskIds) {
                if (!currentIds.has(taskId)) {
                    await api.linkTaskToEntry(entry.id, taskId)
                }
            }
            for (const link of currentLinks) {
                if (!selectedTaskIds.has(link.todoist_task_id)) {
                    await api.unlinkTaskFromEntry(entry.id, link.todoist_task_id)
                }
            }
            setIsEditing(false)
            onUpdate()
        } catch (error) {
            console.error("Error updating entry:", error)
        }
    }

    const handleDelete = async () => {
        if (!entry) return
        const confirmed = window.confirm(
            "Delete this entry? This action cannot be undone."
        )
        if (!confirmed) return
        try {
            await deleteEntryMutation.mutateAsync(entry.id)
            onOpenChange(false)
            onUpdate()
        } catch (error) {
            console.error("Error deleting entry:", error)
        }
    }

    const handleCancelEdit = () => {
        if (entry) {
            form.reset({
                title: entry.title,
                content: entry.content,
                project_names: entry.projects.map(p => p.name),
            })
        }
        setIsEditing(false)
        setSelectedTaskIds(new Set())
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        })
    }

    if (!entry) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between pr-8">
                        <div>
                            <DialogTitle className="text-2xl">
                                {isEditing ? "Edit Entry" : entry.title}
                            </DialogTitle>
                            {!isEditing && (
                                <DialogDescription>
                                    {formatDate(entry.created_at)}
                                </DialogDescription>
                            )}
                        </div>
                        {!isEditing && (
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDelete}
                                    disabled={deleteEntryMutation.isPending}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {isEditing ? (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={updateEntryMutation.isPending}>
                                    {updateEntryMutation.isPending ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown>{entry.content}</ReactMarkdown>
                        </div>

                        {entry.projects && entry.projects.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {entry.projects.map((project) => (
                                    <span
                                        key={project.id}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize"
                                        style={{
                                            backgroundColor: project.color,
                                            color: getReadableTextColor(project.color),
                                        }}
                                    >
                                        {project.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        <TaskPanel entryId={entry.id} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
