'use client';

import { useState, useEffect } from 'react';
import { useApi, JournalEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { NewEntryDialog } from '@/components/new-entry-dialog';
import { EntryDialog } from '@/components/entry-dialog';
import { Plus, Calendar, Flame } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getReadableTextColor } from '@/lib/utils';

function formatHeaderDate(date: Date): string {
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th';

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();

  return `${weekday} ${day}${suffix} ${month}, ${year}`;
}

function calculateStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const uniqueDays = new Set(
    entries.map((e) => new Date(e.created_at).toDateString())
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (uniqueDays.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export default function Home() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const api = useApi();

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEntries = async () => {
    try {
      const data = await api.getEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const streak = calculateStreak(entries);

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
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            {/* Title */}
            <h1 className="text-4xl font-bold mb-1">Today</h1>

            {/* Streak */}
            <div className="flex items-center gap-1.5 mb-3">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-muted-foreground">
                {streak} day{streak !== 1 ? 's' : ''} streak
              </span>
            </div>

            {/* Date row with New Entry button */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-base font-medium text-muted-foreground">
                {formatHeaderDate(new Date())}
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                size="sm"
                className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New entry
              </Button>
            </div>

            <Separator className="mt-4" />
          </div>

          {/* Entries List */}
          {entries.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No entries yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your journaling journey by creating your first entry
              </p>
              <Button onClick={() => setDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Create your first entry
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {entries.map((entry, index) => {
                const showDate =
                  index === 0 ||
                  formatDate(entry.created_at) !==
                    formatDate(entries[index - 1].created_at);

                return (
                  <div key={entry.id}>
                    {showDate && index !== 0 && (
                      <div className="mb-4 mt-2">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </h2>
                        <Separator className="mt-2" />
                      </div>
                    )}

                    <div
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <NewEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadEntries}
      />

      <EntryDialog
        entry={selectedEntry}
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        onUpdate={loadEntries}
      />
    </div>
  );
}