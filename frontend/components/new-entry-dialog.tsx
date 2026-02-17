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
import { useApi } from "@/lib/api"

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
    const api = useApi()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            focus_point_names: [],
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsSubmitting(true)
        try {
            await api.createEntry(values)
            form.reset()
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
            <DialogContent className="sm:max-w-[600px]">
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