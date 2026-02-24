'use client'

import { JournalEntry } from '@/lib/api'
import { Calendar } from '@/components/ui/calendar'

interface MonthCalendarProps {
  entries: JournalEntry[]
  currentMonth: Date
  selectedDay: Date
  onMonthChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

export function MonthCalendar({
  entries,
  currentMonth,
  selectedDay,
  onMonthChange,
  onDayClick,
}: MonthCalendarProps) {
  const entryDates = new Set(
    entries.map((e) => new Date(e.created_at).toDateString())
  )

  return (
    <Calendar
      mode="single"
      selected={selectedDay}
      onSelect={(date) => date && onDayClick(date)}
      month={currentMonth}
      onMonthChange={onMonthChange}
      captionLayout="dropdown"
      className="w-full [&_.rdp-months]:w-full [&_table]:w-full [&_td]:p-0"
      modifiers={{ hasEntry: (date) => entryDates.has(date.toDateString()) }}
      components={{
        DayButton: ({ day, modifiers, className, ...props }) => {
          const hasEntry = entryDates.has(day.date.toDateString())
          return (
            <div className="relative w-full h-full flex items-center justify-center">
              <button
                className={className}
                {...props}
              />
              {hasEntry && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary pointer-events-none"
                  style={{ bottom: '4px' }}
                  aria-hidden
                />
              )}
            </div>
          )
        },
      }}
    />
  )
}