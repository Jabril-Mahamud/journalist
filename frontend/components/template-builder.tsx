'use client'

/**
 * template-builder.tsx
 *
 * Two-tab interface for building templates:
 *   Visual — drag-and-drop field list + add-field panel
 *   Raw    — plain textarea showing/editing the raw syntax directly
 *
 * Switching tabs syncs content both ways via parseTemplate / blocksToRaw.
 */

import * as React from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    parseTemplate,
    blocksToRaw,
    FieldBlock,
    FieldType,
} from '@/lib/template-parser'
import { GripVertical, Trash2, Plus, Code, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
    { value: 'textarea', label: 'Text area', description: 'Large freetext box' },
    { value: 'text', label: 'Text', description: 'Single line input' },
    { value: 'stars', label: 'Stars', description: '1–5 star rating' },
    { value: 'select', label: 'Select', description: 'Dropdown with options' },
    { value: 'number', label: 'Number', description: 'Numeric input' },
    { value: 'checkbox', label: 'Checkbox', description: 'Yes / No toggle' },
]

const TYPE_BADGES: Record<FieldType, string> = {
    textarea: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    text: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    stars: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    select: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    number: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    checkbox: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

// ─── Build a raw line from parts ─────────────────────────────────────────────

function buildFieldLine(type: FieldType, label: string, options: string): string {
    const optionsPart =
        type === 'select' && options.trim()
            ? `{options="${options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
                .join(',')}"}`
            : ''
    return `::${type}[${label}]${optionsPart}`
}

// ─── Sortable field row ───────────────────────────────────────────────────────

interface SortableFieldRowProps {
    id: string
    block: FieldBlock
    onDelete: () => void
}

function SortableFieldRow({ id, block, onDelete }: SortableFieldRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id })

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5',
                isDragging && 'shadow-lg'
            )}
        >
            {/* Drag handle */}
            <button
                type="button"
                className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {/* Type badge */}
            <span
                className={cn(
                    'text-xs font-medium rounded px-1.5 py-0.5 shrink-0',
                    TYPE_BADGES[block.type]
                )}
            >
                {block.type}
            </span>

            {/* Label */}
            <span className="flex-1 text-sm truncate">{block.label}</span>

            {/* Options preview for select */}
            {block.type === 'select' && block.options.length > 0 && (
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
                    {block.options.join(', ')}
                </span>
            )}

            {/* Delete */}
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                aria-label={`Delete ${block.label} field`}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}

// ─── Static block row ─────────────────────────────────────────────────────────

function StaticBlockRow({ raw }: { raw: string }) {
    if (!raw.trim()) return null
    return (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2">
            <Code className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-mono truncate">{raw}</span>
            <span className="text-xs text-muted-foreground shrink-0">
                (edit in Raw tab)
            </span>
        </div>
    )
}

// ─── Add field panel ──────────────────────────────────────────────────────────

interface AddFieldPanelProps {
    onAdd: (line: string) => void
    onCancel: () => void
}

function AddFieldPanel({ onAdd, onCancel }: AddFieldPanelProps) {
    const [type, setType] = React.useState<FieldType>('text')
    const [label, setLabel] = React.useState('')
    const [options, setOptions] = React.useState('')

    const handleAdd = () => {
        if (!label.trim()) return
        onAdd(buildFieldLine(type, label.trim(), options))
        setLabel('')
        setOptions('')
        setType('text')
    }

    return (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-medium">Add a field</p>

            <div className="grid grid-cols-2 gap-3">
                {/* Type picker */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FIELD_TYPES.map((ft) => (
                                <SelectItem key={ft.value} value={ft.value}>
                                    {ft.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Label */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                        placeholder="e.g. Energy Level"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        autoFocus
                    />
                </div>
            </div>

            {/* Options — only for select */}
            {type === 'select' && (
                <div className="space-y-1.5">
                    <Label className="text-xs">
                        Options{' '}
                        <span className="text-muted-foreground font-normal">(comma-separated)</span>
                    </Label>
                    <Input
                        placeholder="rest, push, work, recovery"
                        value={options}
                        onChange={(e) => setOptions(e.target.value)}
                    />
                </div>
            )}

            {/* Preview */}
            {label.trim() && (
                <div className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1.5">
                    {buildFieldLine(type, label.trim(), options)}
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={handleAdd}
                    disabled={!label.trim()}
                >
                    Add field
                </Button>
            </div>
        </div>
    )
}

// ─── Syntax cheatsheet ────────────────────────────────────────────────────────

function SyntaxCheatsheet() {
    const [open, setOpen] = React.useState(false)
    return (
        <div className="text-xs text-muted-foreground">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Syntax reference
            </button>
            {open && (
                <div className="mt-2 font-mono space-y-1 border rounded-md p-3 bg-muted/40">
                    <p>::textarea[Label]</p>
                    <p>::text[Label]</p>
                    <p>::stars[Label]</p>
                    <p>::select[Label]&#123;options=&quot;a,b,c&quot;&#125;</p>
                    <p>::number[Label]</p>
                    <p>::checkbox[Label]</p>
                    <p className="text-muted-foreground pt-1">
                        Any other line is treated as static markdown.
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── Main TemplateBuilder ────────────────────────────────────────────────────

export interface TemplateBuilderProps {
    value: string
    onChange: (value: string) => void
}

export function TemplateBuilder({ value, onChange }: TemplateBuilderProps) {
    const [activeTab, setActiveTab] = React.useState<'visual' | 'raw'>('visual')
    const [showAddPanel, setShowAddPanel] = React.useState(false)

    // The canonical source-of-truth lives in `value` (the raw string).
    // We parse it on demand for the visual tab.
    const blocks = React.useMemo(() => parseTemplate(value), [value])

    // For dnd-kit we need stable IDs for each block.
    // We use index-based IDs but regenerate when content changes.
    const blockIds = React.useMemo(
        () => blocks.map((_, i) => `block-${i}`),
        [blocks]
    )

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // ── Tab switching ──────────────────────────────────────────────────────────

    const handleTabChange = (tab: string) => {
        // Both tabs read from / write to `value` — no sync needed here,
        // but we close the add-field panel when switching to Raw.
        if (tab === 'raw') setShowAddPanel(false)
        setActiveTab(tab as 'visual' | 'raw')
    }

    // ── Visual tab operations ──────────────────────────────────────────────────

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIndex = blockIds.indexOf(active.id as string)
        const newIndex = blockIds.indexOf(over.id as string)
        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(blocks, oldIndex, newIndex)
        onChange(blocksToRaw(reordered))
    }

    const handleDeleteBlock = (index: number) => {
        const updated = blocks.filter((_, i) => i !== index)
        onChange(blocksToRaw(updated))
    }

    const handleAddField = (newLine: string) => {
        // Append the new field line (with a leading blank line if content exists)
        const trimmed = value.trimEnd()
        onChange(trimmed ? `${trimmed}\n\n${newLine}` : newLine)
        setShowAddPanel(false)
    }

    // ── Field-only blocks (for the sortable context) ───────────────────────────
    // We render ALL blocks in visual order; only field blocks are sortable.
    // Static blocks are rendered as inert rows.
    const fieldBlockIds = blockIds.filter((_, i) => blocks[i].kind === 'field')

    return (
        <div className="space-y-3">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="visual">
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Visual
                        </TabsTrigger>
                        <TabsTrigger value="raw">
                            <Code className="h-3.5 w-3.5 mr-1.5" />
                            Raw
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ── Visual tab ─────────────────────────────────────────────────── */}
                <TabsContent value="visual" className="space-y-2 mt-3">
                    {blocks.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                            No fields yet. Add a field below or switch to Raw to write the
                            template directly.
                        </p>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={fieldBlockIds}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {blocks.map((block, index) => {
                                    const id = blockIds[index]
                                    if (block.kind === 'field') {
                                        return (
                                            <SortableFieldRow
                                                key={id}
                                                id={id}
                                                block={block}
                                                onDelete={() => handleDeleteBlock(index)}
                                            />
                                        )
                                    }
                                    return <StaticBlockRow key={id} raw={block.raw} />
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Add field */}
                    {showAddPanel ? (
                        <AddFieldPanel
                            onAdd={handleAddField}
                            onCancel={() => setShowAddPanel(false)}
                        />
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddPanel(true)}
                            className="w-full mt-2"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add field
                        </Button>
                    )}
                </TabsContent>

                {/* ── Raw tab ────────────────────────────────────────────────────── */}
                <TabsContent value="raw" className="mt-3">
                    <Textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-[220px] font-mono text-sm resize-none"
                        placeholder={`## {{date}}\n\n::stars[Energy Level]\n::select[Day Type]{options="rest,push,work,recovery"}\n::textarea[Journal]`}
                        spellCheck={false}
                    />
                </TabsContent>
            </Tabs>

            <SyntaxCheatsheet />
        </div>
    )
}