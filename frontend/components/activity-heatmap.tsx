'use client';

import { JournalEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

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

function getLast365Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 364; i >= 0; i--) {
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
  const groupedEntries = groupEntriesByDate(entries);
  const allDays = getLast365Days();
  
  // Organize days into weeks (7 days per week, 52 weeks)
  const weeks: string[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  
  // Get month labels for the top
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
  
  // Filter day labels - show only Mon, Wed, Fri
  const visibleDayIndices = [0, 2, 4]; // Mon, Wed, Fri
  
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels */}
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
        
        {/* Grid with day labels */}
        <div className="flex gap-1">
          {/* Day labels column */}
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
          
          {/* Weeks grid */}
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
        
        {/* Legend */}
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
  );
}
