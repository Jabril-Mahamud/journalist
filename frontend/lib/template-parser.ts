/**
 * template-parser.ts
 *
 * Parses the Journalist template syntax into structured blocks,
 * and assembles those blocks + user values back into markdown.
 *
 * Field syntax:  ::type[Label]{options}
 * Row syntax:    ::type[Label] | ::type[Label] | ...
 * Example:       ::stars[Energy Level] | ::select[Day Type]{options="rest,push,work,recovery"}
 *
 * Any line that does NOT match the ::type[Label] pattern is treated
 * as a static markdown block and passed through unchanged.
 *
 * Textarea fields cannot be placed in rows.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType =
    | 'textarea'
    | 'text'
    | 'stars'
    | 'select'
    | 'number'
    | 'checkbox'

export interface FieldBlock {
    kind: 'field'
    type: FieldType
    label: string
    /** Parsed options array — only populated for `select` fields */
    options: string[]
    /** The raw line as it appeared in the template (useful for round-trip editing) */
    raw: string
}

export interface StaticBlock {
    kind: 'static'
    raw: string
}

/**
 * A row block groups two or more non-textarea fields onto the same line.
 * Syntax: ::stars[Energy Level] | ::select[Day Type]{options="a,b,c"}
 */
export interface RowBlock {
    kind: 'row'
    fields: FieldBlock[]
    raw: string
}

export type TemplateBlock = FieldBlock | StaticBlock | RowBlock

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set<FieldType>([
    'textarea',
    'text',
    'stars',
    'select',
    'number',
    'checkbox',
])

/** Types that are not allowed inside a row (they need full width) */
const ROW_INCOMPATIBLE_TYPES = new Set<FieldType>(['textarea'])

/**
 * Matches lines like:
 *   ::stars[Energy Level]
 *   ::select[Day Type]{options="rest,push,work,recovery"}
 *   ::textarea[Journal]
 *
 * Capture groups:
 *   1 → type
 *   2 → label
 *   3 → raw options string inside {} (optional)
 */
const FIELD_REGEX = /^::([a-z]+)\[([^\]]+)\](?:\{([^}]*)\})?$/

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses the options portion of a field definition.
 * Handles:  options="rest,push,work,recovery"
 * Returns an empty array for field types that don't use options.
 */
function parseOptions(optionsStr: string): string[] {
    const match = optionsStr.match(/options="([^"]*)"/)
    if (!match) return []
    return match[1]
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
}

/**
 * Tries to parse a single trimmed segment as a FieldBlock.
 * Returns null if it doesn't match or the type is unsupported.
 */
function parseFieldSegment(segment: string, rawSegment: string): FieldBlock | null {
    const match = segment.match(FIELD_REGEX)
    if (!match) return null
    const [, rawType, label, optionsStr] = match
    const type = rawType as FieldType
    if (!SUPPORTED_TYPES.has(type)) return null
    return { kind: 'field', type, label, options: parseOptions(optionsStr ?? ''), raw: rawSegment }
}

// ─── parseTemplate ────────────────────────────────────────────────────────────

/**
 * Parses a template content string into an ordered list of TemplateBlocks.
 *
 * Rules:
 * - Each line is examined independently.
 * - Lines containing ` | ` where every segment is a valid non-textarea field
 *   become RowBlocks.
 * - Lines matching `::type[Label]{options}` become FieldBlocks.
 * - Unrecognised `::xxx` syntax (invalid type) falls back to StaticBlock.
 * - Each line keeps its own block so that reassembling the raw content is lossless.
 */
export function parseTemplate(content: string): TemplateBlock[] {
    const lines = content.split('\n')
    const blocks: TemplateBlock[] = []

    for (const line of lines) {
        // ── Try row syntax first ───────────────────────────────────────────────
        if (line.includes(' | ')) {
            const segments = line.split(' | ')
            const fieldBlocks: FieldBlock[] = []
            let allValid = true

            for (const segment of segments) {
                const trimmed = segment.trim()
                const fb = parseFieldSegment(trimmed, trimmed)
                if (!fb || ROW_INCOMPATIBLE_TYPES.has(fb.type)) {
                    allValid = false
                    break
                }
                fieldBlocks.push(fb)
            }

            if (allValid && fieldBlocks.length >= 2) {
                blocks.push({ kind: 'row', fields: fieldBlocks, raw: line })
                continue
            }
            // If it didn't qualify as a row, fall through to single-field / static
        }

        // ── Try single field ───────────────────────────────────────────────────
        const match = line.trim().match(FIELD_REGEX)
        if (match) {
            const [, rawType, label, optionsStr] = match
            const type = rawType as FieldType
            if (SUPPORTED_TYPES.has(type)) {
                blocks.push({
                    kind: 'field',
                    type,
                    label,
                    options: parseOptions(optionsStr ?? ''),
                    raw: line,
                })
                continue
            }
        }

        // ── Static fallback ────────────────────────────────────────────────────
        blocks.push({ kind: 'static', raw: line })
    }

    return blocks
}

// ─── assembleMarkdown ─────────────────────────────────────────────────────────

function assembleField(block: FieldBlock, values: Record<string, string>): string {
    const value = values[block.label] ?? ''

    switch (block.type) {
        case 'textarea':
            return value

        case 'stars': {
            const starCount = Math.min(5, Math.max(0, parseInt(value, 10) || 0))
            return `**${block.label}:** ${'⭐'.repeat(starCount)}`
        }

        case 'checkbox': {
            const checked =
                value === 'true' || value === '1' || value.toLowerCase() === 'yes'
            return `**${block.label}:** ${checked ? 'Yes' : 'No'}`
        }

        case 'text':
        case 'select':
        case 'number':
            return `**${block.label}:** ${value}`
    }
}

/**
 * Assembles a list of TemplateBlocks and their corresponding user values
 * into a final markdown string suitable for storing in `journal_entries.content`.
 *
 * Row blocks assemble each field inline, separated by ` · `.
 */
export function assembleMarkdown(
    blocks: TemplateBlock[],
    values: Record<string, string>
): string {
    const lines: string[] = []

    for (const block of blocks) {
        if (block.kind === 'static') {
            lines.push(block.raw)
        } else if (block.kind === 'row') {
            // Join all field outputs on a single line separated by a soft divider
            const parts = block.fields.map((f) => assembleField(f, values))
            lines.push(parts.join(' · '))
        } else {
            lines.push(assembleField(block, values))
        }
    }

    return lines.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the default/empty initial values map for a set of blocks.
 * Useful for initialising React state before the user has typed anything.
 */
export function defaultValues(blocks: TemplateBlock[]): Record<string, string> {
    const values: Record<string, string> = {}
    for (const block of blocks) {
        if (block.kind === 'field') {
            values[block.label] = ''
        } else if (block.kind === 'row') {
            for (const field of block.fields) {
                values[field.label] = ''
            }
        }
    }
    return values
}

/**
 * Serialises a list of TemplateBlocks back to the raw template syntax string.
 * Useful for round-tripping between the Visual and Raw tabs in TemplateBuilder.
 */
export function blocksToRaw(blocks: TemplateBlock[]): string {
    return blocks.map((b) => b.raw).join('\n')
}