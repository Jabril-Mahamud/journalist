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
