'use client';

import { useState } from 'react';
import { JournalEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActivityHeatmapProps {
  entries: JournalEntry[];
  onDayClick?: (date: string) => void;
}

function groupEntriesByDate(entries: JournalEntry[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  
  entries.forEach((entry) => {
    const date = entry.created_at.split('T')[0];
    grouped[date] = (grouped[date] || 0) + 1;
  });
  
  return grouped;
}

function getDefaultRange(entries: JournalEntry[]): number {
  if (entries.length === 0) return 90;

  const earliestDate = entries.reduce((earliest, entry) => {
    const date = new Date(entry.created_at);
    return date < earliest ? date : earliest;
  }, new Date(entries[0].created_at));

  const today = new Date();
  const daysDiff = Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 90) return 90;
  if (daysDiff <= 180) return 180;
  return 365;
}

function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
}

function getColorClass(count: number): string {
  if (count === 0) {
    return 'bg-muted dark:bg-muted';
  } else if (count === 1) {
    return 'bg-green-200 dark:bg-green-900';
  } else if (count === 2) {
    return 'bg-green-400 dark:bg-green-700';
  } else if (count === 3) {
    return 'bg-green-600 dark:bg-green-600';
  } else {
    return 'bg-green-800 dark:bg-green-500';
  }
}

function getTooltip(date: string, count: number): string {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  if (count === 0) {
    return `${formattedDate}: No entries`;
  } else if (count === 1) {
    return `${formattedDate}: 1 entry`;
  } else {
    return `${formattedDate}: ${count} entries`;
  }
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ActivityHeatmap({ entries, onDayClick }: ActivityHeatmapProps) {
  const [range, setRange] = useState(() => getDefaultRange(entries));
  const groupedEntries = groupEntriesByDate(entries);
  const allDays = getLastNDays(range);
  
  const weeks: string[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  
  const getMonthLabels = (): { month: string; index: number }[] => {
    const labels: { month: string; index: number }[] = [];
    let lastMonth = -1;
    
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek) {
        const date = new Date(firstDayOfWeek);
        const month = date.getMonth();
        
        if (month !== lastMonth) {
          labels.push({ month: MONTH_LABELS[month], index: weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  };
  
  const monthLabels = getMonthLabels();
  const visibleDayIndices = [0, 2, 4];
  
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Tabs value={range.toString()} onValueChange={(v: string) => setRange(parseInt(v))}>
          <TabsList className="h-7">
            <TabsTrigger value="90" className="text-xs px-2 py-1">3 months</TabsTrigger>
            <TabsTrigger value="180" className="text-xs px-2 py-1">6 months</TabsTrigger>
            <TabsTrigger value="365" className="text-xs px-2 py-1">1 year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full">
          <div 
            className="grid gap-1 mb-2"
            style={{ gridTemplateColumns: `24px repeat(${weeks.length}, minmax(12px, 1fr))` }}
          >
            <div className="w-6" />
            {monthLabels.map(({ month, index }) => (
              <div
                key={`${month}-${index}`}
                className="text-xs text-muted-foreground"
                style={{ gridColumn: index + 2 }}
              >
                {month}
              </div>
            ))}
          </div>
          
          <div className="flex gap-1">
            <div className="flex flex-col gap-1 pr-2">
              {DAY_LABELS.map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    'h-3 text-[10px] text-muted-foreground leading-3',
                    visibleDayIndices.includes(index) ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((date, dayIndex) => {
                    const count = groupedEntries[date] || 0;
                    const isToday = date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <button
                        key={`${weekIndex}-${dayIndex}`}
                        type="button"
                        onClick={() => onDayClick?.(date)}
                        className={cn(
                          'w-3 h-3 rounded-sm transition-all duration-200 hover:ring-2 hover:ring-ring hover:ring-offset-1',
                          getColorClass(count),
                          isToday && 'ring-2 ring-ring ring-offset-1'
                        )}
                        title={getTooltip(date, count)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((count) => (
                <div
                  key={count}
                  className={cn('w-3 h-3 rounded-sm', getColorClass(count))}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
