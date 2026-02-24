'use client';

import { useState, useRef, useEffect } from 'react';
import { JournalEntry } from '@/lib/api';
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

// Uses the app's primary red (hsl 0 72% 51%) with opacity steps
function getCellStyle(count: number, isToday: boolean): React.CSSProperties {
  if (isToday && count === 0) {
    return { backgroundColor: 'hsl(0 72% 51% / 0.15)', outline: '1.5px solid hsl(0 72% 51% / 0.5)', outlineOffset: '-1px' };
  }
  if (isToday) {
    return { backgroundColor: getCellBg(count), outline: '1.5px solid hsl(0 72% 51%)', outlineOffset: '-1px' };
  }
  return { backgroundColor: getCellBg(count) };
}

function getCellBg(count: number): string {
  if (count === 0) return 'hsl(0 0% 0% / 0.06)';
  if (count === 1) return 'hsl(0 72% 51% / 0.25)';
  if (count === 2) return 'hsl(0 72% 51% / 0.45)';
  if (count === 3) return 'hsl(0 72% 51% / 0.65)';
  return 'hsl(0 72% 51% / 0.88)';
}

// Dark mode versions
function getCellBgDark(count: number): string {
  if (count === 0) return 'hsl(0 0% 100% / 0.06)';
  if (count === 1) return 'hsl(0 72% 51% / 0.3)';
  if (count === 2) return 'hsl(0 72% 51% / 0.5)';
  if (count === 3) return 'hsl(0 72% 51% / 0.7)';
  return 'hsl(0 72% 51% / 0.9)';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANGE_OPTIONS = [
  { value: 90, label: '3mo' },
  { value: 180, label: '6mo' },
  { value: 365, label: '1yr' },
];

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export function ActivityHeatmap({ entries, onDayClick }: ActivityHeatmapProps) {
  const [range, setRange] = useState(() => getDefaultRange(entries));
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, content: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedEntries = groupEntriesByDate(entries);
  const allDays = getLastNDays(range);
  const todayStr = new Date().toISOString().split('T')[0];

  const weeks: string[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Month label positions
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    if (week[0]) {
      const m = new Date(week[0]).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTH_LABELS[m], col: weekIdx });
        lastMonth = m;
      }
    }
  });

  const totalEntries = entries.length;
  const activeDays = Object.keys(groupedEntries).filter(d => allDays.includes(d)).length;

  const handleMouseEnter = (e: React.MouseEvent, date: string, count: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const d = new Date(date + 'T12:00:00');
    const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const content = count === 0
      ? `${dateLabel} · No entries`
      : `${dateLabel} · ${count} ${count === 1 ? 'entry' : 'entries'}`;

    setTooltip({
      visible: true,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      content,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(t => ({ ...t, visible: false }));
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold">{totalEntries} entries</span>
          <span className="text-xs text-muted-foreground">{activeDays} active days</span>
        </div>

        {/* Range toggle */}
        <div className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                range === opt.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full pb-1">
          {/* Month labels */}
          <div
            className="grid mb-1.5"
            style={{ gridTemplateColumns: `20px repeat(${weeks.length}, 1fr)`, gap: '3px' }}
          >
            <div />
            {weeks.map((_, weekIdx) => {
              const label = monthLabels.find(m => m.col === weekIdx);
              return (
                <div key={weekIdx} className="h-4">
                  {label && (
                    <span className="text-[10px] font-medium text-muted-foreground leading-none">
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Day labels + cells */}
          <div className="flex gap-[3px]">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-[3px] pr-1">
              {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => (
                <div key={i} className="w-4 h-[11px] flex items-center justify-end">
                  <span className="text-[9px] text-muted-foreground leading-none">{d}</span>
                </div>
              ))}
            </div>

            {/* Cells */}
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}
            >
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((date, dayIdx) => {
                    const count = groupedEntries[date] || 0;
                    const isToday = date === todayStr;
                    return (
                      <button
                        key={`${weekIdx}-${dayIdx}`}
                        type="button"
                        onClick={() => onDayClick?.(date)}
                        onMouseEnter={(e) => handleMouseEnter(e, date, count)}
                        onMouseLeave={handleMouseLeave}
                        className={cn(
                          'w-[11px] h-[11px] rounded-[2px] transition-opacity duration-100 hover:opacity-75 cursor-pointer'
                        )}
                        style={getCellStyle(count, isToday)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {[0, 1, 2, 3, 4].map(count => (
              <div
                key={count}
                className="w-[11px] h-[11px] rounded-[2px]"
                style={{ backgroundColor: getCellBg(count) }}
              />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bg-popover border text-popover-foreground text-xs px-2.5 py-1.5 rounded-md shadow-md whitespace-nowrap">
            {tooltip.content}
          </div>
          <div className="w-2 h-2 bg-popover border-b border-r rotate-45 mx-auto -mt-1 shadow-sm" />
        </div>
      )}
    </div>
  );
}