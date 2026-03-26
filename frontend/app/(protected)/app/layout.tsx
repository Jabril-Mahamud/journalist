export const dynamic = 'force-dynamic'

import { Prefetcher } from './prefetcher'

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