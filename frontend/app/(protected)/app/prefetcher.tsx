'use client'

import { useEntries, useProjects } from '@/lib/hooks/useEntries'
import { useTemplates } from '@/lib/hooks/useTemplates'

export function Prefetcher() {
    useEntries()
    useProjects()
    useTemplates()
    return null
}