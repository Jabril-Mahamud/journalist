'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries } from '@/lib/hooks/useEntries'
import { EntryDialog } from '@/components/entry-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { getReadableTextColor, stripMarkdown, isSameDay } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Flame, PenLine, Inbox } from 'lucide-react'

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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKS = 53

function monFirstDow(d: Date) {
  return (d.getDay() + 6) % 7
}

interface HeatDay {
  date: Date
  key: string
  entries: number
  words: number
  isFuture: boolean
}

function buildHeatGrid(entryMap: Record<string, { entries: number; words: number }>): HeatDay[][] {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(endOfWeek.getDate() + (6 - monFirstDow(endOfWeek)))
  const start = new Date(endOfWeek)
  start.setDate(start.getDate() - (WEEKS * 7) + 1)

  const weeks: HeatDay[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const days: HeatDay[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(date.getDate() + w * 7 + d)
      const key = toDateKey(date)
      const data = entryMap[key] || { entries: 0, words: 0 }
      days.push({ date, key, isFuture: date > today, ...data })
    }
    weeks.push(days)
  }
  return weeks
}

interface HeatmapProps {
  entries: JournalEntry[]
  selectedDay: string
  onDayClick: (date: string) => void
}

function Heatmap({ entries, selectedDay, onDayClick }: HeatmapProps) {
  const [metric, setMetric] = useState<'entries' | 'words'>('entries')
  const [hover, setHover] = useState<{ x: number; y: number; cell: HeatDay } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const entryMap = useMemo(() => {
    const map: Record<string, { entries: number; words: number }> = {}
    entries.forEach(e => {
      const k = e.created_at.split('T')[0]
      const wordCount = e.content?.trim().split(/\s+/).length || 0
      if (!map[k]) map[k] = { entries: 0, words: 0 }
      map[k].entries++
      map[k].words += wordCount
    })
    return map
  }, [entries])

  const weeks = useMemo(() => buildHeatGrid(entryMap), [entryMap])
  const todayKey = toDateKey(new Date())

  const maxWords = useMemo(() => weeks.flat().reduce((m, d) => Math.max(m, d.words), 0), [weeks])

  const intensity = (d: HeatDay) => {
    if (d.isFuture) return -1
    const v = metric === 'entries' ? d.entries : d.words
    if (!v) return 0
    if (metric === 'entries') return Math.min(4, v)
    const r = v / (maxWords || 1)
    if (r > 0.75) return 4
    if (r > 0.50) return 3
    if (r > 0.25) return 2
    return 1
  }

  const allDays = weeks.flat().filter(d => !d.isFuture)
  const totalEntries = allDays.reduce((s, d) => s + d.entries, 0)
  const totalWords = allDays.reduce((s, d) => s + d.words, 0)
  const activeDays = allDays.filter(d => d.entries > 0).length
  let curStreak = 0
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].entries > 0) curStreak++; else break
  }
  let longest = 0, run = 0
  allDays.forEach(d => { if (d.entries > 0) { run++; longest = Math.max(longest, run) } else run = 0 })

  const monthLabels = useMemo(() => {
    const labels: { wi: number; label: string }[] = []
    let lastM = -1, lastWi = -99
    weeks.forEach((wk, wi) => {
      const m = wk[0].date.getMonth()
      if (m !== lastM && wi - lastWi >= 3) {
        labels.push({ wi, label: MONTH_SHORT[m] })
        lastM = m
        lastWi = wi
      }
    })
    return labels
  }, [weeks])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
  }, [])

  const showTip = (e: React.MouseEvent, d: HeatDay) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const parent = cardRef.current?.getBoundingClientRect()
    if (!parent) return
    setHover({
      x: rect.left + rect.width / 2 - parent.left,
      y: rect.top - parent.top,
      cell: d,
    })
  }

  const cellClass = (level: number) => {
    if (level === 0) return 'bg-secondary'
    if (level === 1) return 'bg-primary/20'
    if (level === 2) return 'bg-primary/45'
    if (level === 3) return 'bg-primary/70'
    return 'bg-primary'
  }

  return (
    <div ref={cardRef} className="bg-card border border-border rounded-[14px] p-4 md:p-[18px] mb-6 relative">
      {/* Header: stats + metric toggle */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div className="min-w-0">
          <div className="font-serif text-[15px] text-muted-foreground font-medium tracking-tight flex items-baseline gap-2 flex-wrap">
            {metric === 'entries' ? (
              <><span className="text-[28px] text-foreground font-medium tabular-nums tracking-tighter">{totalEntries}</span> entries</>
            ) : (
              <><span className="text-[28px] text-foreground font-medium tabular-nums tracking-tighter">{totalWords > 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</span> words</>
            )}
            <span className="text-[13px] text-muted-foreground">· past year</span>
          </div>
          <div className="text-[12.5px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
            <span><b className="font-semibold text-foreground/70">{activeDays}</b> active days</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1 text-primary font-semibold">
              <Flame className="h-[11px] w-[11px]" /> {curStreak}-day streak
            </span>
            <span className="text-border">·</span>
            <span>longest <b className="font-semibold text-foreground/70">{longest}</b></span>
          </div>
        </div>
        <div className="inline-flex bg-secondary rounded-md p-[3px] gap-0.5 shrink-0">
          <button
            className={`px-[11px] py-[5px] rounded-[5px] text-[12px] font-medium transition-colors ${metric === 'entries' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMetric('entries')}
          >
            Entries
          </button>
          <button
            className={`px-[11px] py-[5px] rounded-[5px] text-[12px] font-medium transition-colors ${metric === 'words' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setMetric('words')}
          >
            Words
          </button>
        </div>
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="overflow-x-auto overflow-y-visible pb-1 relative" style={{ scrollbarWidth: 'thin' }}>
        <div className="grid w-max" style={{ gridTemplateColumns: '28px max-content', gridTemplateRows: '16px max-content', gap: '4px 6px' }}>
          {/* Month labels row */}
          <div
            className="col-start-2 row-start-1 grid font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 12px)`, columnGap: '3px', fontSize: '10.5px', letterSpacing: '0.02em' }}
          >
            {monthLabels.map((l, i) => (
              <span key={i} className="whitespace-nowrap self-end leading-none" style={{ gridColumn: `${l.wi + 1} / span 3` }}>
                {l.label}
              </span>
            ))}
          </div>

          {/* Day-of-week labels */}
          <div
            className="col-start-1 row-start-2 grid text-[10px] text-muted-foreground font-medium"
            style={{ gridTemplateRows: 'repeat(7, 12px)', rowGap: '3px' }}
          >
            <span /><span className="leading-[12px] text-right">Mon</span><span />
            <span className="leading-[12px] text-right">Wed</span><span />
            <span className="leading-[12px] text-right">Fri</span><span />
          </div>

          {/* Heatmap cells */}
          <div
            className="col-start-2 row-start-2 grid"
            style={{ gridTemplateColumns: `repeat(${WEEKS}, 12px)`, gridTemplateRows: 'repeat(7, 12px)', columnGap: '3px', rowGap: '3px' }}
          >
            {weeks.map((week, wi) =>
              week.map((d, di) => {
                const i = intensity(d)
                const isSel = d.key === selectedDay
                const isToday = d.key === todayKey
                if (i === -1) return (
                  <span
                    key={`${wi}-${di}`}
                    className="block"
                    style={{ gridColumn: wi + 1, gridRow: di + 1, width: 12, height: 12 }}
                  />
                )
                return (
                  <button
                    key={`${wi}-${di}`}
                    type="button"
                    className={`block w-[12px] h-[12px] rounded-[3px] border-0 p-0 transition-transform duration-75 cursor-pointer
                      ${cellClass(i)}
                      ${isToday ? 'outline outline-[1.5px] outline-primary outline-offset-1' : ''}
                      ${isSel ? 'outline outline-2 outline-foreground outline-offset-1 z-[3] relative' : ''}
                      ${!isToday && !isSel ? 'hover:outline hover:outline-[1.5px] hover:outline-foreground/50 hover:outline-offset-1 hover:z-[2] hover:relative' : ''}
                    `}
                    style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                    onMouseEnter={(e) => showTip(e, d)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onDayClick(d.key)}
                    aria-label={`${d.date.toDateString()}, ${d.entries} entries`}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Tooltip */}
        {hover && (
          <div
            className="absolute pointer-events-none whitespace-nowrap bg-foreground text-background px-2.5 py-1.5 rounded-md shadow-md z-10 flex flex-col items-center gap-px"
            style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, -100%)', marginTop: -6 }}
          >
            <strong className="font-semibold text-[11.5px]">
              {hover.cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </strong>
            <span className="text-[10.5px] opacity-75">
              {metric === 'entries'
                ? (hover.cell.entries ? `${hover.cell.entries} ${hover.cell.entries === 1 ? 'entry' : 'entries'}` : 'No entries')
                : (hover.cell.words ? `${hover.cell.words.toLocaleString()} words` : 'No writing')}
            </span>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-foreground" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 text-[11px] text-muted-foreground">
        <span>Less</span>
        <span className="w-[11px] h-[11px] rounded-[3px] bg-secondary" />
        <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/20" />
        <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/45" />
        <span className="w-[11px] h-[11px] rounded-[3px] bg-primary/70" />
        <span className="w-[11px] h-[11px] rounded-[3px] bg-primary" />
        <span>More</span>
        <span className="ml-auto text-[11px] text-muted-foreground/60 italic hidden md:inline">
          Click any day to jump to it below
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
