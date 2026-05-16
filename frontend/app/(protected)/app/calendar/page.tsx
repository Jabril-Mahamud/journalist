'use client'

import { useState, useMemo, useRef } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries } from '@/lib/hooks/useEntries'
import { EntryDialog } from '@/components/entry-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getReadableTextColor, stripMarkdown, isSameDay, calculateStreak } from '@/lib/utils'
import { ChevronLeft, ChevronRight, CalendarDays, Flame, PenLine, Inbox } from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const RANGE_OPTIONS = [
  { value: 90, label: '3 mo' },
  { value: 180, label: '6 mo' },
  { value: 365, label: 'year' },
]

function getLastNDays(n: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function getDefaultRange(entries: JournalEntry[]) {
  if (!entries.length) return 90
  const earliest = entries.reduce((e, entry) => {
    const d = new Date(entry.created_at)
    return d < e ? d : e
  }, new Date(entries[0].created_at))
  const diff = Math.floor((Date.now() - earliest.getTime()) / 86400000)
  return diff <= 90 ? 90 : diff <= 180 ? 180 : 365
}

interface HeatmapProps {
  entries: JournalEntry[]
  selectedDay: string
  onDayClick: (date: string) => void
}

function Heatmap({ entries, selectedDay, onDayClick }: HeatmapProps) {
  const [scope, setScope] = useState(() => getDefaultRange(entries))
  const containerRef = useRef<HTMLDivElement>(null)

  const grouped = useMemo(() => {
    const map: Record<string, number> = {}
    entries.forEach(e => {
      const k = e.created_at.split('T')[0]
      map[k] = (map[k] || 0) + 1
    })
    return map
  }, [entries])

  const allDays = getLastNDays(scope)
  const todayStr = new Date().toISOString().split('T')[0]

  const weeks: string[][] = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const activeDays = Object.keys(grouped).filter(d => allDays.includes(d)).length

  const getCellClass = (count: number) => {
    if (count === 0) return 'bg-secondary'
    if (count === 1) return 'bg-primary/25'
    if (count === 2) return 'bg-primary/45'
    if (count === 3) return 'bg-primary/65'
    return 'bg-primary'
  }

  return (
    <div ref={containerRef} className="bg-card border border-border rounded-[14px] p-4 md:p-[18px] mb-6">
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2.5">
        <div>
          <div className="font-serif text-[22px] md:text-[22px] text-[18px] font-medium tracking-tight">
            {entries.length} entries in the last year
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            {activeDays} active days · current {calculateStreak(entries)} days
          </div>
        </div>
        <div className="inline-flex bg-secondary rounded-md p-0.5 gap-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`px-2.5 py-1 rounded text-[11.5px] font-medium transition-colors ${scope === opt.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setScope(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-1.5">
        <div className="flex gap-[3px]" style={{ minWidth: `${weeks.length * 14}px` }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((date, di) => {
                const count = grouped[date] || 0
                const isToday = date === todayStr
                const isSelected = date === selectedDay
                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    onClick={() => onDayClick(date)}
                    className={`w-[11px] h-[11px] rounded-[2.5px] transition-all duration-100 hover:opacity-75 ${getCellClass(count)} ${isSelected ? 'ring-1 ring-foreground ring-offset-1 ring-offset-background' : ''
                      } ${isToday && count === 0 ? 'ring-1 ring-primary/40 ring-offset-1 ring-offset-background' : ''}`}
                    title={count ? `${count} entries` : 'no entries'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2.5">
        <span className="text-[11px] text-muted-foreground">Less</span>
        <span className="w-[11px] h-[11px] rounded-[2.5px] bg-secondary" />
        <span className="w-[11px] h-[11px] rounded-[2.5px] bg-primary/25" />
        <span className="w-[11px] h-[11px] rounded-[2.5px] bg-primary/45" />
        <span className="w-[11px] h-[11px] rounded-[2.5px] bg-primary/65" />
        <span className="w-[11px] h-[11px] rounded-[2.5px] bg-primary" />
        <span className="text-[11px] text-muted-foreground">More</span>
        <span className="ml-auto flex gap-2">
          {MONTH_LABELS.map(m => <span key={m} className="text-[10px] text-muted-foreground hidden md:inline">{m}</span>)}
        </span>
      </div>
    </div>
  )
}

// ─── Month Calendar ────────────────────────────────────────────────────────────

interface MonthCalProps {
  entries: JournalEntry[]
  currentMonth: Date
  selectedDay: Date
  onMonthChange: (d: Date) => void
  onDayClick: (d: Date) => void
}

function MonthCal({ entries, currentMonth, selectedDay, onMonthChange, onDayClick }: MonthCalProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const entryMap = useMemo(() => {
    const m: Record<string, number> = {}
    entries.forEach(e => {
      const k = e.created_at.split('T')[0]
      m[k] = (m[k] || 0) + 1
    })
    return m
  }, [entries])

  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  // Sunday-first grid
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1))
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1))

  return (
    <div className="md:sticky md:top-6">
      <div className="flex items-center justify-between mb-3.5">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <h3 className="font-serif text-base font-medium">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10.5px] font-semibold uppercase text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const date = new Date(year, month, day)
          const key = toDateKey(date)
          const count = entryMap[key] || 0
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDay)

          return (
            <button
              key={i}
              onClick={() => onDayClick(date)}
              type="button"
              className={`
                relative flex flex-col items-center justify-center h-[38px] rounded-lg text-[13px] transition-all
                ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                ${isToday && !isSelected ? 'text-primary font-semibold' : ''}
                ${!isSelected ? 'hover:bg-secondary' : ''}
                ${!isSelected && !isToday ? 'text-foreground' : ''}
              `}
            >
              {day}
              {count > 0 && (
                <span className="absolute bottom-1 flex gap-[2px]">
                  {Array.from({ length: Math.min(count, 3) }).map((_, ci) => (
                    <i key={ci} className={`w-[3px] h-[3px] rounded-full not-italic ${isSelected ? 'bg-primary-foreground/80' : 'bg-primary'}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Entry Card ────────────────────────────────────────────────────────────────

function EntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const time = new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <button type="button" onClick={onClick} className="w-full text-left group">
      <div className="border border-border rounded-[14px] p-4 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-serif text-base font-medium leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {entry.title}
          </h3>
          <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">
            {time}
          </span>
        </div>

        <p className="text-[13.5px] text-muted-foreground line-clamp-3 leading-relaxed mb-3">
          {stripMarkdown(entry.content)}
        </p>

        {entry.projects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.projects.map(p => (
              <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
                style={{ backgroundColor: p.color, color: getReadableTextColor(p.color) }}>
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 space-y-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid md:grid-cols-[340px_1fr] gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const { data: entries = [], isLoading, refetch } = useEntries()

  const selectedDayStr = toDateKey(selectedDay)

  const dayEntries = useMemo(
    () => entries.filter(e => isSameDay(new Date(e.created_at), selectedDay)),
    [entries, selectedDay]
  )

  const handleHeatmapClick = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    setSelectedDay(d)
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }

  const handleCalendarClick = (d: Date) => {
    setSelectedDay(d)
    if (d.getMonth() !== currentMonth.getMonth() || d.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  if (isLoading) return <CalendarSkeleton />

  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 md:py-8 pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium tracking-tight leading-none">
            Calendar
          </h1>
          <span className="text-[13px] text-muted-foreground">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Heatmap */}
      <Heatmap entries={entries} selectedDay={selectedDayStr} onDayClick={handleHeatmapClick} />

      {/* Split: calendar + entries */}
      <div className="grid md:grid-cols-[340px_1fr] gap-6 items-start">
        {/* Month calendar */}
        <div className="bg-card border border-border rounded-[14px] p-4 md:p-[18px]">
          <MonthCal
            entries={entries}
            currentMonth={currentMonth}
            selectedDay={selectedDay}
            onMonthChange={setCurrentMonth}
            onDayClick={handleCalendarClick}
          />
        </div>

        {/* Day panel */}
        <div>
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="font-serif text-[21px] font-medium tracking-tight">{formatLongDate(selectedDay)}</h2>
            <span className="text-[12px] text-muted-foreground">
              {dayEntries.length ? `${dayEntries.length} entries` : 'no entries'}
            </span>
          </div>

          {dayEntries.length === 0 ? (
            <div className="border border-dashed border-muted-foreground/20 rounded-[14px] py-9 px-6 flex flex-col items-center gap-2.5 text-center">
              <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                <Inbox className="h-[18px] w-[18px]" />
              </div>
              <p className="text-[13.5px] text-muted-foreground">
                Nothing on {selectedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} yet.
              </p>
              <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold hover:brightness-105 transition-all">
                <PenLine className="h-3 w-3" />
                Write something
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onClick={() => {
                  setSelectedEntry(entry)
                  setEntryDialogOpen(true)
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={() => refetch()}
      />
    </div>
  )
}
