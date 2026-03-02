/**
 * template-parser.ts
 *
 * Parses the Journalist template syntax into structured blocks,
 * and assembles those blocks + user values back into markdown.
 *
 * Field syntax:  ::type[Label]{options}
 * Example:       ::select[Day Type]{options="rest,push,work,recovery"}
 *
 * Any line that does NOT match the ::type[Label] pattern is treated
 * as a static markdown block and passed through unchanged.
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

export type TemplateBlock = FieldBlock | StaticBlock

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set<FieldType>([
    'textarea',
    'text',
    'stars',
    'select',
    'number',
    'checkbox',
])

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

// ─── parseTemplate ────────────────────────────────────────────────────────────

/**
 * Parses a template content string into an ordered list of TemplateBlocks.
 *
 * Rules:
 * - Each line is examined independently.
 * - Lines matching `::type[Label]{options}` become FieldBlocks.
 * - Unrecognised `::xxx` syntax (invalid type) falls back to StaticBlock.
 * - Consecutive static lines are NOT merged — each line keeps its own block so
 *   that reassembling the raw content is always lossless.
 */
export function parseTemplate(content: string): TemplateBlock[] {
    const lines = content.split('\n')
    const blocks: TemplateBlock[] = []

    for (const line of lines) {
        const match = line.trim().match(FIELD_REGEX)

        if (match) {
            const [, rawType, label, optionsStr] = match
            const type = rawType as FieldType

            if (SUPPORTED_TYPES.has(type)) {
                const options = parseOptions(optionsStr ?? '')
                blocks.push({ kind: 'field', type, label, options, raw: line })
                continue
            }
        }

        // Anything that didn't match (or matched an unknown type) is static
        blocks.push({ kind: 'static', raw: line })
    }

    return blocks
}

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

// ─── assembleMarkdown ─────────────────────────────────────────────────────────

/**
 * Assembles a list of TemplateBlocks and their corresponding user values
 * into a final markdown string suitable for storing in `journal_entries.content`.
 *
 * @param blocks  The parsed template blocks (from parseTemplate).
 * @param values  A map of `label → raw user input` for each field block.
 *                Keys are the field labels exactly as they appear in the template.
 *                Missing values are treated as empty strings.
 */
export function assembleMarkdown(
    blocks: TemplateBlock[],
    values: Record<string, string>
): string {
    const lines: string[] = []

    for (const block of blocks) {
        if (block.kind === 'static') {
            lines.push(block.raw)
            continue
        }

        const value = values[block.label] ?? ''

        switch (block.type) {
            case 'textarea':
                // Raw value, no label prefix — this is the main prose field
                lines.push(value)
                break

            case 'stars': {
                const starCount = Math.min(5, Math.max(0, parseInt(value, 10) || 0))
                const stars = '⭐'.repeat(starCount)
                lines.push(`**${block.label}:** ${stars}`)
                break
            }

            case 'checkbox': {
                const checked =
                    value === 'true' || value === '1' || value.toLowerCase() === 'yes'
                lines.push(`**${block.label}:** ${checked ? 'Yes' : 'No'}`)
                break
            }

            case 'text':
            case 'select':
            case 'number':
                lines.push(`**${block.label}:** ${value}`)
                break
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