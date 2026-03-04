'use client'

/**
 * structured-entry-form.tsx
 *
 * Renders a parsed template as an interactive form.
 * Each TemplateBlock becomes a typed input control; static blocks
 * are rendered as read-only markdown.
 *
 * Consecutive non-textarea field blocks (separated only by blank lines)
 * are automatically rendered side-by-side in a two-column grid.
 */

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import { TemplateBlock, FieldBlock, assembleMarkdown } from '@/lib/template-parser'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Star Rating ──────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
}

function StarRating({ value, onChange }: StarRatingProps) {
  const [hovered, setHovered] = React.useState(0)
  const display = hovered || value

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(value === star ? 0 : star)}
          className={cn(
            'text-2xl leading-none transition-transform hover:scale-110 focus-visible:outline-none',
            star <= display ? 'opacity-100' : 'opacity-25'
          )}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}

// ─── Select with free-type fallback ──────────────────────────────────────────

const FREE_TYPE_VALUE = '__other__'

interface SelectWithOtherProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  label: string
}

function SelectWithOther({ options, value, onChange, label }: SelectWithOtherProps) {
  const isPreset = options.some((o) => o.toLowerCase() === value.toLowerCase())
  const [showOther, setShowOther] = React.useState(!isPreset && value !== '')

  const handleSelectChange = (selected: string) => {
    if (selected === FREE_TYPE_VALUE) {
      setShowOther(true)
      onChange('')
    } else {
      setShowOther(false)
      onChange(selected)
    }
  }

  return (
    <div className="space-y-2">
      <Select
        value={showOther ? FREE_TYPE_VALUE : value || ''}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Select an option…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
          <SelectItem value={FREE_TYPE_VALUE}>Other…</SelectItem>
        </SelectContent>
      </Select>

      {showOther && (
        <Input
          placeholder="Type a custom value…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}
    </div>
  )
}

// ─── Single field renderer ────────────────────────────────────────────────────

interface FieldControlProps {
  block: FieldBlock
  value: string
  onChange: (value: string) => void
}

function FieldControl({ block, value, onChange }: FieldControlProps) {
  const id = `field-${block.label.replace(/\s+/g, '-').toLowerCase()}`

  switch (block.type) {
    case 'textarea':
      return (
        <Textarea
          id={id}
          placeholder={`Write your ${block.label.toLowerCase()}…`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[140px] resize-none text-base"
        />
      )

    case 'text':
      return (
        <Input
          id={id}
          placeholder={`Enter ${block.label.toLowerCase()}…`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        />
      )

    case 'stars':
      return (
        <StarRating
          value={parseInt(value, 10) || 0}
          onChange={(n) => onChange(String(n))}
        />
      )

    case 'select':
      return (
        <SelectWithOther
          label={block.label}
          options={block.options}
          value={value}
          onChange={onChange}
        />
      )

    case 'checkbox': {
      const checked = value === 'true'
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(c) => onChange(c ? 'true' : 'false')}
          />
          <Label htmlFor={id} className="cursor-pointer font-normal">
            {block.label}
          </Label>
        </div>
      )
    }
  }
}

// ─── Render group types ───────────────────────────────────────────────────────

type RenderItem =
  | { kind: 'single'; blockIndex: number }
  | { kind: 'pair'; blockIndexA: number; blockIndexB: number }

// ─── Pre-process blocks into render items ────────────────────────────────────

/**
 * Scans blocks and groups consecutive non-textarea field blocks
 * (separated only by blank static lines) into side-by-side pairs.
 */
function buildRenderItems(blocks: TemplateBlock[]): RenderItem[] {
  const items: RenderItem[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    // Is this a small field (not textarea)?
    if (block.kind === 'field' && block.type !== 'textarea') {
      // Look ahead past blank statics for the next block
      let j = i + 1
      while (j < blocks.length && blocks[j].kind === 'static' && !blocks[j].raw.trim()) {
        j++
      }

      // If the next non-blank block is also a small field, pair them
      if (
        j < blocks.length &&
        blocks[j].kind === 'field' &&
        (blocks[j] as FieldBlock).type !== 'textarea'
      ) {
        items.push({ kind: 'pair', blockIndexA: i, blockIndexB: j })
        i = j + 1 // skip both fields and blank statics between them
        continue
      }
    }

    items.push({ kind: 'single', blockIndex: i })
    i++
  }

  return items
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface StructuredEntryFormProps {
  blocks: TemplateBlock[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  formRef?: React.RefObject<StructuredEntryFormHandle>
}

export interface StructuredEntryFormHandle {
  getMarkdown: () => string
}

export function StructuredEntryForm({
  blocks,
  values,
  onChange,
  formRef,
}: StructuredEntryFormProps) {
  React.useImperativeHandle(formRef, () => ({
    getMarkdown: () => assembleMarkdown(blocks, values),
  }))

  const handleFieldChange = (label: string, value: string) => {
    onChange({ ...values, [label]: value })
  }

  const renderItems = React.useMemo(() => buildRenderItems(blocks), [blocks])

  const renderField = (block: FieldBlock) => {
    const value = values[block.label] ?? ''
    const onFieldChange = (v: string) => handleFieldChange(block.label, v)

    if (block.type === 'checkbox') {
      return (
        <div className="py-1">
          <FieldControl block={block} value={value} onChange={onFieldChange} />
        </div>
      )
    }

    if (block.type === 'textarea') {
      return (
        <FieldControl block={block} value={value} onChange={onFieldChange} />
      )
    }

    return (
      <div className="space-y-1.5">
        <Label
          htmlFor={`field-${block.label.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-sm font-medium"
        >
          {block.label}
        </Label>
        <FieldControl block={block} value={value} onChange={onFieldChange} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {renderItems.map((item, index) => {
        // ── Paired fields → two-column grid ──────────────────────────────────
        if (item.kind === 'pair') {
          const blockA = blocks[item.blockIndexA] as FieldBlock
          const blockB = blocks[item.blockIndexB] as FieldBlock
          return (
            <div key={index} className="grid grid-cols-2 gap-4">
              {renderField(blockA)}
              {renderField(blockB)}
            </div>
          )
        }

        // ── Single item ───────────────────────────────────────────────────────
        const block = blocks[item.blockIndex]

        if (block.kind === 'static') {
          if (!block.raw.trim()) {
            return <div key={index} className="h-1" />
          }
          return (
            <div
              key={index}
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
            >
              <ReactMarkdown>{block.raw}</ReactMarkdown>
            </div>
          )
        }

        return (
          <div key={index}>
            {renderField(block as FieldBlock)}
          </div>
        )
      })}
    </div>
  )
}