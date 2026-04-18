import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getReadableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(date, today)) {
    return 'Today'
  } else if (isSameDay(date, yesterday)) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }
}

export function calculateStreak(entries: { created_at: string }[]): number {
  if (entries.length === 0) return 0

  const uniqueDays = new Set(
    entries.map((e) => new Date(e.created_at).toDateString())
  )

  const today = new Date()
  const todayStr = today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toDateString()

  let startDate: Date
  if (uniqueDays.has(todayStr)) {
    startDate = today
  } else if (uniqueDays.has(yesterdayStr)) {
    startDate = yesterday
  } else {
    return 0
  }

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() - i)
    if (uniqueDays.has(d.toDateString())) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function stripMarkdown(text: string): string {
  let result = text

  result = result.replace(/^#{1,6}\s+/gm, '')
  result = result.replace(/\*\*(.+?)\*\*/g, '$1')
  result = result.replace(/\*(.+?)\*/g, '$1')
  result = result.replace(/__(.+?)__/g, '$1')
  result = result.replace(/_(.+?)_/g, '$1')
  result = result.replace(/`{3}[\s\S]*?`{3}/g, '')
  result = result.replace(/`([^`]+)`/g, '$1')
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
  result = result.replace(/^[\s]*[-*+]\s+/gm, '')
  result = result.replace(/^[\s]*\d+\.\s+/gm, '')
  result = result.replace(/^\s*>\s?/gm, '')
  result = result.replace(/\n{3,}/g, '\n\n')

  return result.trim()
}
