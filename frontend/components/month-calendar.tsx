'use client'

import { JournalEntry } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MonthCalendarProps {
  entries: JournalEntry[]
  currentMonth: Date
  selectedDay: Date
  onMonthChange: (date: Date) => void
  onDayClick: (date: Date) => void
}

function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const days: Date[] = []
  
  const startPadding = (firstDay.getDay() + 6) % 7
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }
  
  const endPadding = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }
  
  return days
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthCalendar({
  entries,
  currentMonth,
  selectedDay,
  onMonthChange,
  onDayClick,
}: MonthCalendarProps) {
  const days = getDaysInMonth(currentMonth)
  const currentMonthNum = currentMonth.getMonth()
  
  const goToPreviousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }
  
  const goToNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }
  
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">{monthYear}</h2>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
        
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentMonthNum
          const isSelected = isSameDay(day, selectedDay)
          const dayEntries = getEntriesForDay(entries, day)
          const hasEntries = dayEntries.length > 0
          const isToday = isSameDay(day, new Date())
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                'relative aspect-square p-2 rounded-lg transition-colors text-sm',
                'hover:bg-accent/50 cursor-pointer',
                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                isSelected && 'bg-accent',
                isToday && !isSelected && 'ring-1 ring-ring'
              )}
            >
              <span>{day.getDate()}</span>
              {hasEntries && (
                <span
                  className={cn(
                    'absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full',
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
