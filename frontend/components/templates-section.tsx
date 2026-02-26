'use client'

import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Template } from '@/lib/api'
import {
    useTemplates,
    useCreateTemplate,
    useUpdateTemplate,
    useDeleteTemplate,
} from '@/lib/hooks/useTemplates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Pencil, Trash2, Plus, X, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Schemas ──────────────────────────────────────────────────────────────────

const templateFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    icon: z.string().max(10).optional(),
    content: z.string().min(1, 'Content is required').max(100000),
    is_public: z.boolean().optional(),
})

type TemplateFormValues = z.infer<typeof templateFormSchema>

// ── Template form (create / edit) ────────────────────────────────────────────

interface TemplateFormProps {
    defaultValues?: Partial<TemplateFormValues>
    onSubmit: (values: TemplateFormValues) => Promise<void>
    onCancel: () => void
    isPending: boolean
    submitLabel: string
}

function TemplateForm({
    defaultValues,
    onSubmit,
    onCancel,
    isPending,
    submitLabel,
}: TemplateFormProps) {
    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateFormSchema),
        defaultValues: {
            name: '',
            description: '',
            icon: '',
            content: '',
            is_public: false,
            ...defaultValues,
        },
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-3">
                    <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                            <FormItem className="w-20 shrink-0">
                                <FormLabel>Icon</FormLabel>
                                <FormControl>
                                    <Input placeholder="📝" {...field} className="text-center text-lg" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Daily Journal" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                                <Input placeholder="A short description of this template" {...field} />
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
                                    placeholder="Write your template in markdown..."
                                    className="min-h-[180px] font-mono text-sm resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving…' : submitLabel}
                    </Button>
                </div>
            </form>
        </Form>
    )
}

// ── Single template row ───────────────────────────────────────────────────────

interface TemplateRowProps {
    template: Template
    onEdit: (t: Template) => void
    onDelete: (id: number) => void
    isDeleting: boolean
}

function TemplateRow({ template, onEdit, onDelete, isDeleting }: TemplateRowProps) {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <div className="border rounded-lg overflow-hidden">
            <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors cursor-pointer"
                onClick={() => setExpanded((v) => !v)}
            >
                {template.icon && (
                    <span className="text-lg shrink-0">{template.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                    {template.description && (
                        <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                    )}
                </div>
                {template.is_built_in && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border rounded-md px-2 py-0.5 shrink-0">
                        <Lock className="h-3 w-3" />
                        Built-in
                    </span>
                )}
                {!template.is_built_in && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(template)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(template.id)}
                            disabled={isDeleting}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
                {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
            </div>

            {expanded && (
                <div className="border-t px-4 py-3 bg-muted/20">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                        {template.content}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ── Main section ──────────────────────────────────────────────────────────────

export function TemplatesSection() {
    const { data: templates = [], isLoading } = useTemplates()
    const createMutation = useCreateTemplate()
    const updateMutation = useUpdateTemplate()
    const deleteMutation = useDeleteTemplate()

    const [showCreateForm, setShowCreateForm] = React.useState(false)
    const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null)
    const [deletingId, setDeletingId] = React.useState<number | null>(null)

    const myTemplates = templates.filter((t) => !t.is_built_in)
    const builtInTemplates = templates.filter((t) => t.is_built_in)

    const handleCreate = async (values: TemplateFormValues) => {
        await createMutation.mutateAsync({
            name: values.name,
            content: values.content,
            description: values.description || undefined,
            icon: values.icon || undefined,
            is_public: values.is_public ?? false,
        })
        setShowCreateForm(false)
    }

    const handleUpdate = async (values: TemplateFormValues) => {
        if (!editingTemplate) return
        await updateMutation.mutateAsync({
            id: editingTemplate.id,
            data: {
                name: values.name,
                content: values.content,
                description: values.description || undefined,
                icon: values.icon || undefined,
                is_public: values.is_public ?? false,
            },
        })
        setEditingTemplate(null)
    }

    const handleDelete = async (id: number) => {
        const t = templates.find((t) => t.id === id)
        if (!t) return
        const confirmed = window.confirm(`Delete template "${t.name}"? This cannot be undone.`)
        if (!confirmed) return
        setDeletingId(id)
        try {
            await deleteMutation.mutateAsync(id)
        } finally {
            setDeletingId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
            </div>
        )
    }

    return (
        <div className="space-y-6">

            {/* My Templates */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">My Templates</h3>
                    {!showCreateForm && !editingTemplate && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCreateForm(true)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            New template
                        </Button>
                    )}
                </div>

                {/* Create form */}
                {showCreateForm && (
                    <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium">New template</p>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setShowCreateForm(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <TemplateForm
                            onSubmit={handleCreate}
                            onCancel={() => setShowCreateForm(false)}
                            isPending={createMutation.isPending}
                            submitLabel="Create template"
                        />
                    </div>
                )}

                {/* Edit form */}
                {editingTemplate && (
                    <div className="border rounded-lg p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium">Edit template</p>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setEditingTemplate(null)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <TemplateForm
                            defaultValues={{
                                name: editingTemplate.name,
                                description: editingTemplate.description ?? '',
                                icon: editingTemplate.icon ?? '',
                                content: editingTemplate.content,
                                is_public: editingTemplate.is_public,
                            }}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingTemplate(null)}
                            isPending={updateMutation.isPending}
                            submitLabel="Save changes"
                        />
                    </div>
                )}

                {myTemplates.length === 0 && !showCreateForm && !editingTemplate && (
                    <p className="text-sm text-muted-foreground">
                        No templates yet. Create one to reuse across entries.
                    </p>
                )}

                {myTemplates.length > 0 && (
                    <div className="space-y-2">
                        {myTemplates.map((t) => (
                            <TemplateRow
                                key={t.id}
                                template={t}
                                onEdit={setEditingTemplate}
                                onDelete={handleDelete}
                                isDeleting={deletingId === t.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Built-in Templates */}
            {builtInTemplates.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Built-in Templates</h3>
                        <div className="space-y-2">
                            {builtInTemplates.map((t) => (
                                <TemplateRow
                                    key={t.id}
                                    template={t}
                                    onEdit={() => { }}
                                    onDelete={() => { }}
                                    isDeleting={false}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}