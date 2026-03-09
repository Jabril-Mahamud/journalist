'use client'

import { useEntries } from '@/lib/hooks/useEntries'
import { useProjects } from '@/lib/hooks/useEntries'
import { useTemplates } from '@/lib/hooks/useTemplates'

function Prefetcher() {
    useEntries()
    useProjects()
    useTemplates()
    return null
}

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            <Prefetcher />
            {children}
        </>
    )
}