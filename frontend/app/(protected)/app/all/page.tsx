'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApi, JournalEntry, FocusPoint } from '@/lib/api'
import { AppSidebar } from '@/components/app-sidebar'
import { EntryDialog } from '@/components/entry-dialog'
import { DatePicker } from '@/components/date-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Calendar, X, Plus, Trash2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parse } from 'date-fns'

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function formatEntryDate(dateString: string): string {
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

function groupEntriesByDate(
  entries: JournalEntry[]
): { date: string; entries: JournalEntry[] }[] {
  const groups: Map<string, JournalEntry[]> = new Map()

  entries.forEach((entry) => {
    const dateKey = formatEntryDate(entry.created_at)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(entry)
  })

  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }))
}

export default function AllEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFocusPoints, setActiveFocusPoints] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showTagManager, setShowTagManager] = useState(false)
  const api = useApi()

  useEffect(() => {
    loadEntries()
    loadFocusPoints()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

  const loadFocusPoints = async () => {
    try {
      const data = await api.getFocusPoints()
      setFocusPoints(data)
    } catch (error) {
      console.error('Error loading focus points:', error)
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const titleMatch = entry.title.toLowerCase().includes(query)
        const contentMatch = entry.content.toLowerCase().includes(query)
        if (!titleMatch && !contentMatch) return false
      }

      if (activeFocusPoints.length > 0) {
        const entryFocusNames = entry.focus_points.map((fp) => fp.name)
        const hasAllTags = activeFocusPoints.every((tag) =>
          entryFocusNames.includes(tag)
        )
        if (!hasAllTags) return false
      }

      if (dateFrom || dateTo) {
        const entryDate = new Date(entry.created_at)
        if (dateFrom) {
          const from = parse(dateFrom, 'dd/MM/yyyy', new Date())
          from.setHours(0, 0, 0, 0)
          if (entryDate < from) return false
        }
        if (dateTo) {
          const to = parse(dateTo, 'dd/MM/yyyy', new Date())
          to.setHours(23, 59, 59, 999)
          if (entryDate > to) return false
        }
      }

      return true
    })
  }, [entries, debouncedSearch, activeFocusPoints, dateFrom, dateTo])

  const groupedEntries = useMemo(
    () => groupEntriesByDate(filteredEntries),
    [filteredEntries]
  )

  const toggleFocusPoint = (name: string) => {
    setActiveFocusPoints((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActiveFocusPoints([])
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    try {
      const created = await api.createFocusPoint(newTagName.trim())
      setFocusPoints((prev) => [...prev, created])
      setNewTagName('')
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }

  const handleDeleteTag = async (id: number) => {
    const tag = focusPoints.find((fp) => fp.id === id)
    if (!tag) return

    const confirmed = window.confirm(
      `Delete "${tag.name}"? It will be removed from all entries.`
    )
    if (!confirmed) return

    setDeletingId(id)
    try {
      await api.deleteFocusPoint(id)
      setFocusPoints((prev) => prev.filter((fp) => fp.id !== id))
      setActiveFocusPoints((prev) => prev.filter((name) => name !== tag.name))
    } catch (error) {
      console.error('Failed to delete tag:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const hasActiveFilters =
    searchQuery || activeFocusPoints.length > 0 || dateFrom || dateTo

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
          <h1 className="text-4xl font-bold mb-6">All Entries</h1>

          <div className="space-y-4 mb-6">
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {focusPoints.map((fp) => (
                  <button
                    key={fp.id}
                    onClick={() => toggleFocusPoint(fp.name)}
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer',
                      activeFocusPoints.includes(fp.name)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {fp.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTagManager(!showTagManager)}
                  className="text-muted-foreground"
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Manage tags
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">From</span>
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="Select date"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">To</span>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="Select date"
                  />
                </div>
              </div>
            </div>

            {showTagManager && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold">Manage Tags</h3>
                
                <form onSubmit={handleCreateTag} className="flex gap-2">
                  <Input
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newTagName.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </form>

                {focusPoints.length > 0 && (
                  <div className="space-y-1">
                    {focusPoints.map((fp) => (
                      <div
                        key={fp.id}
                        className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-accent/50"
                      >
                        <span className="capitalize text-sm">{fp.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(fp.id)}
                          disabled={deletingId === fp.id}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === fp.id ? (
                            'Deleting...'
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {focusPoints.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet. Create one above.</p>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {filteredEntries.length}{' '}
            {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </p>

          <Separator className="mb-6" />

          {filteredEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No entries found</h3>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline">
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  Start journaling to see your entries here
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedEntries.map(({ date, entries: dateEntries }) => (
                <div key={date}>
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      {date}
                    </h2>
                    <Separator className="mt-2" />
                  </div>
                  {dateEntries.map((entry) => (
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
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize"
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
              ))}
            </div>
          )}
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
