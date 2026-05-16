import { describe, it, expect } from 'vitest'
import {
    parseTemplate,
    assembleMarkdown,
    defaultValues,
    blocksToRaw,
} from '../lib/template-parser'
import type { FieldBlock, StaticBlock, RowBlock } from '../lib/template-parser'

// ─── parseTemplate ────────────────────────────────────────────────────────────

describe('parseTemplate', () => {
    it('empty string returns single static block with empty raw', () => {
        const blocks = parseTemplate('')
        expect(blocks).toHaveLength(1)
        expect(blocks[0]).toMatchObject({ kind: 'static', raw: '' })
    })

    it('::text[Name] returns one FieldBlock with type text, label Name', () => {
        const blocks = parseTemplate('::text[Name]')
        expect(blocks).toHaveLength(1)
        const block = blocks[0] as FieldBlock
        expect(block.kind).toBe('field')
        expect(block.type).toBe('text')
        expect(block.label).toBe('Name')
        expect(block.options).toEqual([])
    })

    it('::select[Color]{options="red,blue,green"} returns FieldBlock with 3 options', () => {
        const blocks = parseTemplate('::select[Color]{options="red,blue,green"}')
        expect(blocks).toHaveLength(1)
        const block = blocks[0] as FieldBlock
        expect(block.kind).toBe('field')
        expect(block.type).toBe('select')
        expect(block.label).toBe('Color')
        expect(block.options).toEqual(['red', 'blue', 'green'])
    })

    it('row syntax returns a RowBlock with 2 fields', () => {
        const blocks = parseTemplate('::stars[Rating] | ::select[Type]{options="a,b"}')
        expect(blocks).toHaveLength(1)
        const block = blocks[0] as RowBlock
        expect(block.kind).toBe('row')
        expect(block.fields).toHaveLength(2)
        expect(block.fields[0]).toMatchObject({ kind: 'field', type: 'stars', label: 'Rating' })
        expect(block.fields[1]).toMatchObject({ kind: 'field', type: 'select', label: 'Type', options: ['a', 'b'] })
    })

    it('mixed content returns [StaticBlock, FieldBlock, StaticBlock]', () => {
        const blocks = parseTemplate('# Header\n::textarea[Body]\nFooter')
        expect(blocks).toHaveLength(3)
        expect(blocks[0]).toMatchObject({ kind: 'static', raw: '# Header' })
        expect(blocks[1]).toMatchObject({ kind: 'field', type: 'textarea', label: 'Body' })
        expect(blocks[2]).toMatchObject({ kind: 'static', raw: 'Footer' })
    })

    it('::invalid[Foo] falls back to StaticBlock (unsupported type)', () => {
        const blocks = parseTemplate('::invalid[Foo]')
        expect(blocks).toHaveLength(1)
        expect(blocks[0].kind).toBe('static')
    })

    it('textarea in row is rejected, falls back to static', () => {
        const blocks = parseTemplate('::textarea[A] | ::text[B]')
        expect(blocks).toHaveLength(1)
        expect(blocks[0].kind).toBe('static')
    })

    it('row with only 1 valid segment falls back to single field', () => {
        // Only one segment matches — falls through to single-field parse
        const blocks = parseTemplate('::text[Solo] | ::invalid[Bad]')
        expect(blocks).toHaveLength(1)
        // invalid type falls through to static because single-field parse also fails for "::text[Solo] | ::invalid[Bad]"
        // The full line is not a valid field, so it becomes static
        expect(blocks[0].kind).toBe('static')
    })
})

// ─── assembleMarkdown ─────────────────────────────────────────────────────────

describe('assembleMarkdown', () => {
    it('textarea field: value is passed through as-is', () => {
        const blocks = parseTemplate('::textarea[Body]')
        const result = assembleMarkdown(blocks, { Body: 'Hello world' })
        expect(result).toBe('Hello world')
    })

    it('stars field with value "3" produces label + 3 star emojis', () => {
        const blocks = parseTemplate('::stars[Energy]')
        const result = assembleMarkdown(blocks, { Energy: '3' })
        expect(result).toBe('**Energy:** ⭐⭐⭐')
    })

    it('checkbox field with "true" produces "Yes"', () => {
        const blocks = parseTemplate('::checkbox[Done]')
        const result = assembleMarkdown(blocks, { Done: 'true' })
        expect(result).toBe('**Done:** Yes')
    })

    it('checkbox field with "false" produces "No"', () => {
        const blocks = parseTemplate('::checkbox[Done]')
        const result = assembleMarkdown(blocks, { Done: 'false' })
        expect(result).toBe('**Done:** No')
    })

    it('text field produces **Label:** value', () => {
        const blocks = parseTemplate('::text[Name]')
        const result = assembleMarkdown(blocks, { Name: 'Alice' })
        expect(result).toBe('**Name:** Alice')
    })

    it('select field produces **Label:** value', () => {
        const blocks = parseTemplate('::select[Mood]{options="happy,sad"}')
        const result = assembleMarkdown(blocks, { Mood: 'happy' })
        expect(result).toBe('**Mood:** happy')
    })

    it('number field produces **Label:** value', () => {
        const blocks = parseTemplate('::number[Score]')
        const result = assembleMarkdown(blocks, { Score: '42' })
        expect(result).toBe('**Score:** 42')
    })

    it('row block: fields joined with " · "', () => {
        const blocks = parseTemplate('::stars[Energy] | ::select[Mood]{options="happy,sad"}')
        const result = assembleMarkdown(blocks, { Energy: '2', Mood: 'sad' })
        expect(result).toBe('**Energy:** ⭐⭐ · **Mood:** sad')
    })
})

// ─── defaultValues ────────────────────────────────────────────────────────────

describe('defaultValues', () => {
    it('returns empty string for each field label', () => {
        const blocks = parseTemplate('::text[Name]\n::textarea[Notes]')
        const vals = defaultValues(blocks)
        expect(vals).toEqual({ Name: '', Notes: '' })
    })

    it('handles row blocks by extracting nested field labels', () => {
        const blocks = parseTemplate('::stars[Energy] | ::select[Mood]{options="a,b"}')
        const vals = defaultValues(blocks)
        expect(vals).toEqual({ Energy: '', Mood: '' })
    })

    it('ignores static blocks', () => {
        const blocks = parseTemplate('# Header\n::text[Title]')
        const vals = defaultValues(blocks)
        expect(vals).toEqual({ Title: '' })
    })
})

// ─── blocksToRaw ──────────────────────────────────────────────────────────────

describe('blocksToRaw', () => {
    it('round-trips a simple field template', () => {
        const input = '::text[Name]'
        expect(blocksToRaw(parseTemplate(input))).toBe(input)
    })

    it('round-trips a row template', () => {
        const input = '::stars[Rating] | ::select[Type]{options="a,b"}'
        expect(blocksToRaw(parseTemplate(input))).toBe(input)
    })

    it('round-trips a mixed template', () => {
        const input = '# Header\n::textarea[Body]\nFooter'
        expect(blocksToRaw(parseTemplate(input))).toBe(input)
    })

    it('round-trips an empty string', () => {
        const input = ''
        expect(blocksToRaw(parseTemplate(input))).toBe(input)
    })
})
