'use client'

import { useState, useMemo, useRef } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries } from '@/lib/hooks/useEntries'
import { AppSidebar } from '@/components/app-sidebar'
import { EntryDialog } from '@/components/entry-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getReadableTextColor, stripMarkdown } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { ChevronLeft, ChevronRight, CalendarDays, Flame } from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatLongDate(date: Date) {
  const day = date.getDate()
  const suffix = [11, 12, 13].includes(day % 100) ? 'th'
    : day % 10 === 1 ? 'st'
    : day % 10 === 2 ? 'nd'
    : day % 10 === 3 ? 'rd' : 'th'
  return `${date.toLocaleDateString('en-GB', { weekday: 'long' })}, ${day}${suffix} ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const RANGE_OPTIONS = [
  { value: 90, label: '3mo' },
  { value: 180, label: '6mo' },
  { value: 365, label: '1yr' },
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

function getCellColor(count: number, isToday: boolean): React.CSSProperties {
  const bg = count === 0 ? 'hsl(0 0% 0% / 0.06)'
    : count === 1 ? 'hsl(0 72% 51% / 0.25)'
    : count === 2 ? 'hsl(0 72% 51% / 0.45)'
    : count === 3 ? 'hsl(0 72% 51% / 0.65)'
    : 'hsl(0 72% 51% / 0.88)'
  if (isToday && count === 0) return { backgroundColor: 'hsl(0 72% 51% / 0.12)', outline: '1.5px solid hsl(0 72% 51% / 0.4)', outlineOffset: '-1px' }
  if (isToday) return { backgroundColor: bg, outline: '1.5px solid hsl(0 72% 51%)', outlineOffset: '-1px' }
  return { backgroundColor: bg }
}

interface HeatmapProps {
  entries: JournalEntry[]
  selectedDay: string
  onDayClick: (date: string) => void
}

function Heatmap({ entries, selectedDay, onDayClick }: HeatmapProps) {
  const [range, setRange] = useState(() => getDefaultRange(entries))
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({ visible: false, x: 0, y: 0, text: '' })
  const containerRef = useRef<HTMLDivElement>(null)

  const grouped = useMemo(() => {
    const map: Record<string, number> = {}
    entries.forEach(e => {
      const k = e.created_at.split('T')[0]
      map[k] = (map[k] || 0) + 1
    })
    return map
  }, [entries])

  const allDays = getLastNDays(range)
  const todayStr = new Date().toISOString().split('T')[0]

  const weeks: string[][] = []
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7))

  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    if (week[0]) {
      const m = new Date(week[0]).getMonth()
      if (m !== lastMonth) { monthLabels.push({ label: MONTH_LABELS[m], col: wi }); lastMonth = m }
    }
  })

  const activeDays = Object.keys(grouped).filter(d => allDays.includes(d)).length

  const onEnter = (e: React.MouseEvent, date: string, count: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const cr = containerRef.current?.getBoundingClientRect()
    if (!cr) return
    const d = new Date(date + 'T12:00:00')
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    setTooltip({ visible: true, x: rect.left - cr.left + rect.width / 2, y: rect.top - cr.top - 8, text: count === 0 ? `${label} · No entries` : `${label} · ${count} ${count === 1 ? 'entry' : 'entries'}` })
  }

  return (
    <div ref={containerRef} className="relative select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold">{entries.length} entries</span>
          <span className="text-xs text-muted-foreground">{activeDays} active days</span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setRange(opt.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${range === opt.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full pb-1">
          <div className="grid mb-1.5" style={{ gridTemplateColumns: `20px repeat(${weeks.length}, 1fr)`, gap: '3px' }}>
            <div />
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.col === wi)
              return <div key={wi} className="h-4">{lbl && <span className="text-[10px] font-medium text-muted-foreground">{lbl.label}</span>}</div>
            })}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1">
              {['M','','W','','F','','S'].map((d, i) => (
                <div key={i} className="w-4 h-[11px] flex items-center justify-end">
                  <span className="text-[9px] text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((date, di) => {
                    const count = grouped[date] || 0
                    const isToday = date === todayStr
                    const isSelected = date === selectedDay
                    return (
                      <button key={`${wi}-${di}`} type="button" onClick={() => onDayClick(date)}
                        onMouseEnter={e => onEnter(e, date, count)} onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                        className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-100 hover:opacity-75 cursor-pointer ${isSelected ? 'ring-1 ring-foreground ring-offset-[1px] ring-offset-background' : ''}`}
                        style={getCellColor(count, isToday)} />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {[0,1,2,3,4].map(c => (
              <div key={c} className="w-[11px] h-[11px] rounded-[2px]"
                style={{ backgroundColor: c === 0 ? 'hsl(0 0% 0% / 0.06)' : `hsl(0 72% 51% / ${0.25 + c * 0.2})` }} />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>

      {tooltip.visible && (
        <div className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-full" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="bg-popover border text-popover-foreground text-xs px-2.5 py-1.5 rounded-md shadow-md whitespace-nowrap">{tooltip.text}</div>
          <div className="w-2 h-2 bg-popover border-b border-r rotate-45 mx-auto -mt-1" />
        </div>
      )}
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
  const offset = firstDow === 0 ? 6 : firstDow - 1 // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1))
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold">
          {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const date = new Date(year, month, day)
          const key = toDateKey(date)
          const count = entryMap[key] || 0
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDay)
          const hasEntries = count > 0

          return (
            <button key={i} onClick={() => onDayClick(date)} type="button"
              className={`
                relative flex flex-col items-center justify-center h-9 rounded-lg text-sm transition-all duration-150 group
                ${isSelected ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : ''}
                ${isToday && !isSelected ? 'font-bold text-primary' : ''}
                ${!isSelected ? 'hover:bg-accent hover:text-accent-foreground' : ''}
                ${!isSelected && !isToday ? 'text-foreground' : ''}
              `}>
              <span className="leading-none">{day}</span>
              {hasEntries && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-[2px]`}>
                  {Array.from({ length: Math.min(count, 3) }).map((_, ci) => (
                    <span key={ci} className={`w-[3px] h-[3px] rounded-full ${isSelected ? 'bg-primary-foreground/70' : 'bg-primary'}`} />
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

// ─── Entry Preview Card ────────────────────────────────────────────────────────

function EntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left group">
      <div className="border rounded-xl p-4 hover:border-primary/40 hover:bg-accent/30 transition-all duration-200 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {entry.title}
          </h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
            {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-3">
          {stripMarkdown(entry.content)}
        </p>

        {entry.projects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.projects.map(p => (
              <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize"
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

function CalendarSkeleton({ sidebarCollapsed, onToggle }: { sidebarCollapsed: boolean, onToggle: () => void }) {
  return (
    <div className="flex h-screen">
      <AppSidebar isCollapsed={sidebarCollapsed} onToggle={onToggle} />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-[380px_1fr] gap-8">
            <Skeleton className="h-80 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebar_collapsed', false)
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

  const streak = useMemo(() => {
    if (!entries.length) return 0
    const unique = new Set(entries.map(e => new Date(e.created_at).toDateString()))
    const today = new Date()
    const start = unique.has(today.toDateString()) ? today
      : (() => { const y = new Date(today); y.setDate(y.getDate() - 1); return unique.has(y.toDateString()) ? y : null })()
    if (!start) return 0
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(start); d.setDate(d.getDate() - i)
      if (unique.has(d.toDateString())) count++; else break
    }
    return count
  }, [entries])

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

  if (isLoading) return <CalendarSkeleton sidebarCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold">Calendar</h1>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{streak} day streak</span>
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="border rounded-xl p-5 mb-6 bg-card">
            <Heatmap entries={entries} selectedDay={selectedDayStr} onDayClick={handleHeatmapClick} />
          </div>

          {/* Split: calendar + entries */}
          <div className="grid grid-cols-[360px_1fr] gap-6 items-start">

            {/* Left: month calendar */}
            <div className="border rounded-xl p-5 bg-card sticky top-8">
              <MonthCal
                entries={entries}
                currentMonth={currentMonth}
                selectedDay={selectedDay}
                onMonthChange={setCurrentMonth}
                onDayClick={handleCalendarClick}
              />
            </div>

            {/* Right: entry preview */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">{formatLongDate(selectedDay)}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dayEntries.length === 0 ? 'No entries' : `${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}`}
                  </p>
                </div>
              </div>

              {dayEntries.length === 0 ? (
                <div className="border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No entries on this day</p>
                  <p className="text-xs text-muted-foreground mt-1">Select a day with dots to view entries</p>
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

        </div>
      </main>

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={() => refetch()}
      />
    </div>
  )
}