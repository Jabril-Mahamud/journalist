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
import { useApi, JournalEntry } from "@/lib/api"
import { Pencil, Trash2 } from "lucide-react"

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    focus_point_names: z.array(z.string()),
})

interface EntryDialogProps {
    entry: JournalEntry | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function EntryDialog({ entry, open, onOpenChange, onUpdate }: EntryDialogProps) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)
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
        if (entry) {
            form.reset({
                title: entry.title,
                content: entry.content,
                focus_point_names: entry.focus_points.map(fp => fp.name),
            })
        }
    }, [entry, form])

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!entry) return
        
        setIsSubmitting(true)
        try {
            await api.updateEntry(entry.id, values)
            setIsEditing(false)
            onUpdate()
        } catch (error) {
            console.error("Error updating entry:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!entry) return
        
        const confirmed = window.confirm(
            "Delete this entry? This action cannot be undone."
        )
        if (!confirmed) return

        setIsDeleting(true)
        try {
            await api.deleteEntry(entry.id)
            onOpenChange(false)
            onUpdate()
        } catch (error) {
            console.error("Error deleting entry:", error)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCancelEdit = () => {
        if (entry) {
            form.reset({
                title: entry.title,
                content: entry.content,
                focus_point_names: entry.focus_points.map(fp => fp.name),
            })
        }
        setIsEditing(false)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    if (!entry) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-start justify-between">
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
                                    disabled={isDeleting}
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
                                            <Textarea
                                                placeholder="Write your thoughts..."
                                                className="min-h-[200px] text-base resize-none"
                                                {...field}
                                            />
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

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-4">
                        <div className="text-base whitespace-pre-wrap">
                            {entry.content}
                        </div>
                        {entry.focus_points && entry.focus_points.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4">
                                {entry.focus_points.map((focusPoint) => (
                                    <span
                                        key={focusPoint.id}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize"
                                    >
                                        {focusPoint.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
