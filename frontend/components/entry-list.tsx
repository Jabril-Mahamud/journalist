'use client';

import { JournalEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface EntryListProps {
  entries?: JournalEntry[];
  onSelectEntry?: (id: number) => void;
  selectedEntryId?: number | null;
}

function EntrySkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-3/4 bg-muted rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EntryList({ entries = [], onSelectEntry, selectedEntryId }: EntryListProps) {

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-4">📝</p>
        <p className="text-lg font-medium">No entries yet</p>
        <p className="text-sm mt-1">Start writing your first journal entry</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isSelected = selectedEntryId === entry.id;
        const truncatedTitle = entry.title.length > 60 
          ? entry.title.slice(0, 60) + '...' 
          : entry.title;
        const truncatedContent = entry.content.length > 100 
          ? entry.content.slice(0, 100) + '...' 
          : entry.content;

        return (
          <Card
            key={entry.id}
            className={cn(
              'cursor-pointer transition-colors',
              'hover:bg-accent',
              isSelected && 'bg-accent/50'
            )}
            onClick={() => onSelectEntry?.(entry.id)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground text-base">
                {truncatedTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-muted-foreground text-sm line-clamp-2">
                {truncatedContent}
              </p>
              {entry.focus_points.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.focus_points.map((focusPoint) => (
                    <span
                      key={focusPoint.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
                    >
                      {focusPoint.name}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                {formatDate(entry.created_at)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
