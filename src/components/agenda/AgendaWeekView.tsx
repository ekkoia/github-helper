import { useMemo } from 'react';
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday,
  parseISO, getHours, getMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Ban } from 'lucide-react';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';
import type { AgendaBlock } from '@/hooks/useAgendaBlocks';
import { ScrollArea } from '@/components/ui/scroll-area';

const HOUR_HEIGHT = 60;
const START_HOUR = 1;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const EVENT_COLORS: Record<string, string> = {
  manual: 'bg-blue-500',
  automation: 'bg-amber-500',
  external: 'bg-emerald-500',
};

interface Props {
  currentDate: Date;
  events: AgendaEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  blockedDays?: Record<string, AgendaBlock[]>;
  onSlotClick?: (date: Date, hour: number) => void;
  onEventClick?: (event: AgendaEvent, e: React.MouseEvent) => void;
}

function getEventPosition(event: AgendaEvent) {
  const start = parseISO(event.start_at);
  const h = getHours(start);
  const m = getMinutes(start);
  const top = (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;

  let height = HOUR_HEIGHT;
  if (event.end_at) {
    const end = parseISO(event.end_at);
    const diffMs = end.getTime() - start.getTime();
    height = Math.max(20, (diffMs / (1000 * 60 * 60)) * HOUR_HEIGHT);
  }

  return { top: Math.max(0, top), height };
}

export function AgendaWeekView({ currentDate, events, selectedDate, onSelectDate, blockedDays = {}, onSlotClick, onEventClick }: Props) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const weekEnd = endOfWeek(currentDate, { locale: ptBR });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const allDayEvents = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      if (ev.all_day) {
        const key = format(parseISO(ev.start_at), 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    }
    return map;
  }, [events]);

  const timedEventsByDay = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      if (!ev.all_day) {
        const key = format(parseISO(ev.start_at), 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    }
    return map;
  }, [events]);

  const hasAnyAllDay = days.some(d => (allDayEvents[format(d, 'yyyy-MM-dd')] || []).length > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted border-b border-border">
        <div className="py-2 px-1 text-center text-xs font-semibold text-muted-foreground" />
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today_ = isToday(day);
          const dayBlocks = blockedDays[key] || [];
          const isBlocked = dayBlocks.some(b => b.all_day);
          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={cn(
                'py-2 px-1 text-center transition-colors hover:bg-muted/80',
                selected && 'bg-primary/10',
                isBlocked && 'bg-destructive/5',
              )}
            >
              <div className="text-xs text-muted-foreground capitalize">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                'text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full',
                today_ && 'bg-primary text-primary-foreground',
              )}>
                {format(day, 'd')}
              </div>
              {isBlocked && <Ban className="h-3 w-3 text-destructive mx-auto" />}
            </button>
          );
        })}
      </div>

      {/* All-day row */}
      {hasAnyAllDay && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-muted/30">
          <div className="py-1 px-1 text-[10px] text-muted-foreground text-right pr-2">Dia todo</div>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayAllDay = allDayEvents[key] || [];
            return (
              <div key={key} className="py-1 px-0.5 space-y-0.5 min-h-[28px]">
                {dayAllDay.map(ev => (
                  <div key={ev.id} className={cn('text-[10px] truncate rounded px-1 py-0.5 text-white', EVENT_COLORS[ev.event_type] || 'bg-muted-foreground')}>
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <ScrollArea className="flex-1 max-h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative pt-2">
          {/* Hour labels */}
          <div className="relative" style={{ overflow: 'visible' }}>
            {HOURS.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span
                  className="absolute right-2 text-[10px] text-muted-foreground leading-none"
                  style={{ top: '-0.45em' }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTimed = timedEventsByDay[key] || [];
            const dayBlocks = blockedDays[key] || [];
            const selected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={key}
                className={cn(
                  'relative border-l border-border',
                  selected && 'bg-primary/5',
                )}
                onClick={() => onSelectDate(day)}
              >
                {/* Hour grid lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-border cursor-pointer hover:bg-muted/30 transition-colors"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={(e) => { e.stopPropagation(); onSlotClick?.(day, hour); }}
                  />
                ))}

                {/* Blocks */}
                {dayBlocks.map((block) => {
                  if (block.all_day) {
                    return (
                      <div
                        key={block.id}
                        className="absolute inset-x-0 bg-destructive/10 border-l-2 border-destructive/30 z-[1]"
                        style={{ top: 0, height: HOURS.length * HOUR_HEIGHT }}
                      />
                    );
                  }
                  if (block.start_time && block.end_time) {
                    const [sh, sm] = block.start_time.split(':').map(Number);
                    const [eh, em] = block.end_time.split(':').map(Number);
                    const top = (sh - START_HOUR) * HOUR_HEIGHT + (sm / 60) * HOUR_HEIGHT;
                    const bottom = (eh - START_HOUR) * HOUR_HEIGHT + (em / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        key={block.id}
                        className="absolute inset-x-0 bg-destructive/10 border-l-2 border-destructive/30 z-[1]"
                        style={{ top: Math.max(0, top), height: Math.max(20, bottom - top) }}
                      />
                    );
                  }
                  return null;
                })}

                {/* Events */}
                {dayTimed.map((ev) => {
                  const pos = getEventPosition(ev);
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        'absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-white text-[10px] leading-tight overflow-hidden z-[2] cursor-pointer hover:opacity-90',
                        EVENT_COLORS[ev.event_type] || 'bg-muted-foreground',
                      )}
                      style={{ top: pos.top, height: pos.height, minHeight: 20 }}
                      title={ev.title}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      <div className="truncate opacity-80">
                        {format(parseISO(ev.start_at), 'HH:mm')}
                        {ev.end_at && ` - ${format(parseISO(ev.end_at), 'HH:mm')}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
