'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { JournalEntry } from '@/lib/api'
import { useEntries, useProjects, useCreateProject, useDeleteProject, useUpdateProjectColor } from '@/lib/hooks/useEntries'
import { EntryDialog } from '@/components/entry-dialog'
import { DatePicker } from '@/components/date-picker'
import { ProjectColorPicker } from '@/components/project-color-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EntryRow } from '@/components/entry-row'
import { Calendar, X, Plus, Trash2, Folder, Search, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { getReadableTextColor, formatRelativeDate } from '@/lib/utils'
import { parse } from 'date-fns'

function groupEntriesByDate(
  entries: JournalEntry[]
): { date: string; entries: JournalEntry[] }[] {
  const groups: Map<string, JournalEntry[]> = new Map()

  entries.forEach((entry) => {
    const dateKey = formatRelativeDate(entry.created_at)
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
  const [showFilters, setShowFilters] = useState(true)

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
  const activeFilterCount = (searchQuery ? 1 : 0) + (activeProjects.length > 0 ? 1 : 0) + ((dateFrom || dateTo) ? 1 : 0)

  const isLoading = entriesLoading || projectsLoading

  if (isLoading) {
    return (
      <div className="max-w-[760px] mx-auto px-7 py-8 md:px-7 px-4.5">
        <Skeleton className="h-10 w-36 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="flex flex-wrap gap-2 mb-6">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto px-7 py-8 md:py-8 pb-6">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
          <h1 className="font-serif text-[clamp(30px,5vw,52px)] font-medium tracking-tight leading-none">
            All entries
          </h1>
          <span className="text-[13px] text-muted-foreground tabular-nums">
            {filteredEntries.length} of {entries.length}
          </span>
        </div>
        <p className="font-serif text-[16.5px] leading-relaxed text-muted-foreground max-w-[56ch] mt-1.5">
          Search, filter, and browse everything you&apos;ve written.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-3.5">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="h-[15px] w-[15px]" />
        </span>
        <input
          placeholder="Search titles & body…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-[42px] pl-10 pr-10 border border-border bg-card rounded-[10px] text-sm outline-none transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/10"
        />
        {searchQuery && (
          <button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Mobile: collapsible filter toggle */}
      <div className="md:hidden mb-3">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 border border-border rounded-[10px] bg-card text-[13px] font-medium"
          onClick={() => setShowFilters(f => !f)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-px rounded-full">
              {activeFilterCount}
            </span>
          )}
          <span className="ml-auto text-muted-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>

      {/* Filter bar */}
      <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-4 md:gap-5 p-4 bg-card border border-border rounded-[14px] mb-5`}>
        <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Projects</label>
          <div className="flex flex-wrap gap-1.5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => toggleProject(project.name)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium capitalize transition-all border"
                style={{
                  backgroundColor: activeProjects.includes(project.name) ? project.color : undefined,
                  color: activeProjects.includes(project.name) ? getReadableTextColor(project.color) : undefined,
                  borderColor: activeProjects.includes(project.name) ? project.color : 'hsl(var(--border))',
                }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full"
                  style={{ backgroundColor: activeProjects.includes(project.name) ? 'rgba(255,255,255,0.7)' : project.color }}
                />
                {project.name}
              </button>
            ))}
            <button
              onClick={() => setShowProjectManager(!showProjectManager)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium text-muted-foreground border border-border hover:bg-secondary transition-colors"
            >
              <Folder className="h-3 w-3" /> Manage
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Date range</label>
          <div className="flex items-center gap-2">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" />
            <span className="text-muted-foreground/40">→</span>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors self-start mt-1"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Project manager */}
      {showProjectManager && (
        <div className="border border-border rounded-[14px] p-4 space-y-4 mb-5 bg-card">
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
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/50"
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

      {/* Results */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-9 border border-dashed border-muted-foreground/20 rounded-[14px] text-center">
          <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <p className="text-[13.5px] text-muted-foreground">No entries found</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-[10px] text-[13px] font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groupedEntries.map(({ date, entries: dateEntries }) => (
            <section key={date}>
              <header className="flex items-baseline justify-between px-1 pb-2 border-b border-border mb-1.5">
                <h2 className="font-serif text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {date}
                </h2>
                <span className="text-[11.5px] text-muted-foreground tabular-nums">
                  {dateEntries.length}
                </span>
              </header>
              <div className="flex flex-col">
                {dateEntries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onClick={() => {
                      setSelectedEntry(entry)
                      setEntryDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={() => refetchEntries()}
      />
    </div>
  )
}
