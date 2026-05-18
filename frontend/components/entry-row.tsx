import { JournalEntry } from '@/lib/api'
import { ChevronRight } from 'lucide-react'
import { getReadableTextColor, stripMarkdown } from '@/lib/utils'

export function EntryRow({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const time = new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const dateStr = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <button
      type="button"
      className="flex items-start gap-3 px-3.5 py-4 rounded-[10px] text-left w-full border-b border-border last:border-b-0 transition-colors hover:bg-card group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] text-muted-foreground tracking-wide mb-1.5">
          {time} · {dateStr}
        </div>
        <h3 className="font-serif text-[19px] font-medium tracking-tight leading-snug mb-1.5">
          {entry.title}
        </h3>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground line-clamp-2 mb-2.5">
          {stripMarkdown(entry.content)}
        </p>
        {entry.projects && entry.projects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {entry.projects.map((project) => (
              <span
                key={project.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
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
      <span className="text-muted-foreground/40 mt-1.5 transition-all group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0">
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}
