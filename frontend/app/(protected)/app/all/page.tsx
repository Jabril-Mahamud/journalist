'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries, useProjects, useCreateProject, useDeleteProject, useUpdateProjectColor } from '@/lib/hooks/useEntries'
import { AppSidebar } from '@/components/app-sidebar'
import { EntryDialog } from '@/components/entry-dialog'
import { DatePicker } from '@/components/date-picker'
import { ProjectColorPicker } from '@/components/project-color-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Calendar, X, Plus, Trash2, Folder, Search } from 'lucide-react'
import { getReadableTextColor, stripMarkdown } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/use-local-storage'
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

function EntrySkeleton() {
  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export default function AllEntriesPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('sidebar_collapsed', false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeProjects, setActiveProjects] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [showProjectManager, setShowProjectManager] = useState(false)
  
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useEntries()
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects()
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()
  const updateProjectColorMutation = useUpdateProjectColor()
  
  const colorUpdateTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})

  useEffect(() => {
    const timeouts = colorUpdateTimeoutRef.current
    return () => {
      Object.values(timeouts).forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
        const titleMatch = entry.title.toLowerCase().includes(query)
        const contentMatch = entry.content.toLowerCase().includes(query)
        if (!titleMatch && !contentMatch) return false
      }

      if (activeProjects.length > 0) {
        const entryProjectNames = entry.projects.map((p) => p.name)
        const hasAllProjects = activeProjects.every((project) =>
          entryProjectNames.includes(project)
        )
        if (!hasAllProjects) return false
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
  }, [entries, debouncedSearch, activeProjects, dateFrom, dateTo])

  const groupedEntries = useMemo(
    () => groupEntriesByDate(filteredEntries),
    [filteredEntries]
  )

  const toggleProject = (name: string) => {
    setActiveProjects((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    )
  }

  const clearFilters = () => {
    setSearchQuery('')
    setActiveProjects([])
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    try {
      await createProjectMutation.mutateAsync(newProjectName.trim())
      setNewProjectName('')
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleDeleteProject = async (id: number) => {
    const project = projects.find((p) => p.id === id)
    if (!project) return

    const confirmed = window.confirm(
      `Delete "${project.name}"? It will be removed from all entries.`
    )
    if (!confirmed) return

    setDeletingId(id)
    try {
      await deleteProjectMutation.mutateAsync(id)
      setActiveProjects((prev) => prev.filter((name) => name !== project.name))
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleColorChange = useCallback((id: number, newColor: string) => {
    updateProjectColorMutation.mutate(
      { id, color: newColor },
      {
        onError: () => {
          refetchProjects()
        }
      }
    )

    if (colorUpdateTimeoutRef.current[id]) {
      clearTimeout(colorUpdateTimeoutRef.current[id])
    }
  }, [updateProjectColorMutation, refetchProjects])

  const hasActiveFilters =
    searchQuery || activeProjects.length > 0 || dateFrom || dateTo

  const isLoading = entriesLoading || projectsLoading

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <Skeleton className="h-10 w-36 mb-6" />
            
            <div className="space-y-4 mb-6">
              <Skeleton className="h-10 w-full" />
              
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
            </div>
            
            <Separator className="mb-6" />
            
            <div className="space-y-6">
              <EntrySkeleton />
              <EntrySkeleton />
              <EntrySkeleton />
              <EntrySkeleton />
            </div>
          </div>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {debouncedSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {debouncedSearch && (
              <p className="text-sm text-muted-foreground">
                Searching title and content for &quot;{debouncedSearch}&quot;
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.name)}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer"
                    style={{
                      backgroundColor: project.color,
                      color: getReadableTextColor(project.color),
                    }}
                  >
                    {project.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProjectManager(!showProjectManager)}
                  className="text-muted-foreground"
                >
                  <Folder className="h-4 w-4 mr-1" />
                  Manage projects
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

            {showProjectManager && (
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold">Manage Projects</h3>
                
                <form onSubmit={handleCreateProject} className="flex gap-2">
                  <Input
                    placeholder="New project name..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!newProjectName.trim() || createProjectMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </form>

                {projects.length > 0 && (
                  <div className="space-y-1">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-2">
                          <ProjectColorPicker
                            color={project.color}
                            onChange={(newColor) => handleColorChange(project.id, newColor)}
                          />
                          <span className="capitalize text-sm">{project.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deletingId === project.id || deleteProjectMutation.isPending}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === project.id ? (
                            'Deleting...'
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No projects yet. Create one above.</p>
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
                            {stripMarkdown(entry.content)}
                          </p>
                          {entry.projects && entry.projects.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {entry.projects.map((project) => (
                                <span
                                  key={project.id}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize"
                                  style={{
                                    backgroundColor: project.color,
                                    color: getReadableTextColor(project.color),
                                  }}
                                >
                                  {project.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
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
        onUpdate={() => refetchEntries()}
      />
    </div>
  )
}
