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
import { TagCombobox } from "@/components/tag-combobox"
import { useApi, TodoistTask } from "@/lib/api"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import ReactMarkdown from "react-markdown"

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    focus_point_names: z.array(z.string()),
})

interface NewEntryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function NewEntryDialog({ open, onOpenChange, onSuccess }: NewEntryDialogProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [todoistConnected, setTodoistConnected] = React.useState(false)
    const [todoistTasks, setTodoistTasks] = React.useState<TodoistTask[]>([])
    const [selectedTaskIds, setSelectedTaskIds] = React.useState<Set<string>>(new Set())
    const [loadingTasks, setLoadingTasks] = React.useState(false)
    const api = useApi()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            focus_point_names: [],
        },
    })

    React.useEffect(() => {
        if (open) {
            loadTodoistData()
        }
    }, [open])

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
        setIsSubmitting(true)
        try {
            const newEntry = await api.createEntry(values)
            for (const taskId of selectedTaskIds) {
                await api.linkTaskToEntry(newEntry.id, taskId)
            }
            form.reset()
            setSelectedTaskIds(new Set())
            onOpenChange(false)
            onSuccess()
        } catch (error) {
            console.error("Error creating entry:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">New Entry</DialogTitle>
                    <DialogDescription>
                        Capture your thoughts and reflections
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            name="focus_point_names"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Focus Points</FormLabel>
                                    <FormControl>
                                        <TagCombobox
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Type to add or search focus points..."
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
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create Entry"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
