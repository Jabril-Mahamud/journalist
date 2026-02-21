'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useApi, JournalEntry } from '@/lib/api'
import { AppSidebar } from '@/components/app-sidebar'
import { ActivityHeatmap } from '@/components/activity-heatmap'
import { MonthCalendar } from '@/components/month-calendar'
import { EntryDialog } from '@/components/entry-dialog'
import { Separator } from '@/components/ui/separator'
import { getReadableTextColor } from '@/lib/utils'

function formatDateHeader(date: Date): string {
  const day = date.getDate()
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th'

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  const month = date.toLocaleDateString('en-GB', { month: 'long' })

  return `${weekday}, ${day}${suffix} ${month}`
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function getEntriesForDay(entries: JournalEntry[], day: Date): JournalEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.created_at)
    return isSameDay(entryDate, day)
  })
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const api = useApi()
  const selectedDayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEntries = async () => {
    try {
      const data = await api.getEntries()
      setEntries(data)
    } catch (error) {
      console.error('Error loading entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    const year = date.getFullYear()
    const month = date.getMonth()
    if (
      month !== currentMonth.getMonth() ||
      year !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(new Date(year, month, 1))
    }
  }

  const handleHeatmapDayClick = (dateString: string) => {
    const date = new Date(dateString + 'T12:00:00')
    setSelectedDay(date)
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    setTimeout(() => {
      selectedDayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const selectedDayEntries = useMemo(
    () => getEntriesForDay(entries, selectedDay),
    [entries, selectedDay]
  )

  if (loading) {
    return (
      <div className="flex h-screen">
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <h1 className="text-4xl font-bold mb-6">Calendar</h1>

          <div className="mb-8">
            <ActivityHeatmap
              entries={entries}
              onDayClick={handleHeatmapDayClick}
            />
          </div>

          <Separator className="mb-8" />

          <div className="mb-8">
            <MonthCalendar
              entries={entries}
              currentMonth={currentMonth}
              selectedDay={selectedDay}
              onMonthChange={setCurrentMonth}
              onDayClick={handleDayClick}
            />
          </div>

          <Separator className="mb-6" />

          <div ref={selectedDayRef}>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {formatDateHeader(selectedDay)}
              </h2>
              <Separator className="mt-2" />
            </div>

            {selectedDayEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No entries on this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group hover:bg-accent/50 -mx-4 px-4 py-4 rounded-lg transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedEntry(entry)
                      setEntryDialogOpen(true)
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {entry.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 mb-3">
                          {entry.content}
                        </p>
                        {entry.focus_points && entry.focus_points.length > 0 && (
                           <div className="flex flex-wrap gap-2">
                             {entry.focus_points.map((focusPoint) => (
                               <span
                                 key={focusPoint.id}
                                 className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize"
                                 style={{
                                   backgroundColor: focusPoint.color,
                                   color: getReadableTextColor(focusPoint.color),
                                 }}
                               >
                                 {focusPoint.name}
                               </span>
                             ))}
                           </div>
                         )}
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={loadEntries}
      />
    </div>
  )
}
