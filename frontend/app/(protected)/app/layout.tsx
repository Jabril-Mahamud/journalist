export const dynamic = 'force-dynamic'

import { Prefetcher } from './prefetcher'
import { AppShell } from '@/components/app-sidebar'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AppShell>
            <Prefetcher />
            {children}
        </AppShell>
    )
}
