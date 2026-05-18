'use client'

import { useState } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries } from '@/lib/hooks/useEntries'
import { NewEntryDialog } from '@/components/new-entry-dialog'
import { EntryDialog } from '@/components/entry-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EntryRow } from '@/components/entry-row'
import { PenLine, Flame, Calendar } from 'lucide-react'
import { formatRelativeDate, calculateStreak } from '@/lib/utils'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function totalWords(entries: JournalEntry[]): string {
  const total = entries.reduce((sum, e) => sum + e.content.split(/\s+/).length, 0)
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`
  return String(total)
}

function EntrySkeleton() {
  return (
    <div className="py-4 px-3.5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  )
}

export default function Home() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const { data: entries = [], isLoading, refetch } = useEntries()

  const streak = calculateStreak(entries)

  if (isLoading) {
    return (
      <div className="max-w-[760px] mx-auto px-7 py-8 md:px-7 px-4.5">
        <div className="mb-7">
          <Skeleton className="h-3 w-48 mb-2" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <EntrySkeleton />
        <EntrySkeleton />
        <EntrySkeleton />
      </div>
    )
  }

  const today = entries.filter(e => formatRelativeDate(e.created_at) === 'Today')
  const yesterday = entries.filter(e => formatRelativeDate(e.created_at) === 'Yesterday')
  const groups = [
    { label: 'Today', entries: today },
    { label: 'Yesterday', entries: yesterday },
  ].filter(g => g.entries.length > 0)

  // If no today/yesterday, show all
  if (groups.length === 0 && entries.length > 0) {
    groups.push({ label: 'Recent', entries: entries.slice(0, 10) })
  }

  return (
    <div className="max-w-[760px] mx-auto px-7 py-8 md:py-8 pb-6">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3.5 text-[12.5px] text-muted-foreground mb-1.5 flex-wrap">
          <span>{formatHeaderDate()}</span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-primary font-semibold">
              <Flame className="h-3 w-3" />
              {streak}-day streak
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
          <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium tracking-tight leading-none">
            {getGreeting()}
          </h1>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {entries.length} entries · {totalWords(entries)} words
          </span>
        </div>
      </div>

      {/* Suggestion card */}
      <div className="bg-card border border-border rounded-[14px] p-4 md:p-5 mb-7 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
        <div className="flex flex-col md:grid md:grid-cols-[auto_1fr_auto] gap-4 items-start md:items-center">
          <div className="flex flex-row md:flex-col items-center md:items-start gap-2.5">
            <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10.5px] font-semibold">
              Daily reflection
            </span>
            <span className="text-[11px] text-muted-foreground/60">~6 min</span>
          </div>
          <div>
            <h3 className="font-serif text-[19px] font-medium mb-1">Start today&apos;s entry</h3>
            <p className="text-[13px] text-muted-foreground">
              Picks up where you left off with prompts and your top tasks.
            </p>
          </div>
          <div className="flex gap-2 self-end md:self-center">
            <button className="px-3.5 py-2 rounded-[10px] text-[13px] font-semibold text-muted-foreground border border-border hover:bg-secondary transition-colors">
              Skip
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold hover:brightness-105 active:translate-y-px transition-all"
              onClick={() => setDialogOpen(true)}
            >
              <PenLine className="h-3 w-3" />
              Begin
            </button>
          </div>
        </div>
      </div>

      {/* Entry groups */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-9 border border-dashed border-muted-foreground/20 rounded-[14px] text-center">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-[13.5px] text-muted-foreground">No entries yet. Start journaling!</p>
          <button
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold hover:brightness-105 transition-all"
            onClick={() => setDialogOpen(true)}
          >
            <PenLine className="h-3 w-3" />
            Write something
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map(group => (
            <section key={group.label}>
              <header className="flex items-baseline justify-between px-1 pb-2 border-b border-border mb-1.5">
                <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </h2>
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {group.entries.length}
                </span>
              </header>
              <div className="flex flex-col">
                {group.entries.map(entry => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => {
                      setSelectedEntry(entry)
                      setEntryDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <NewEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => refetch()}
      />

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={() => refetch()}
      />
    </div>
  )
}
