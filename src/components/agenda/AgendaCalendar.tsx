import { useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Ban } from 'lucide-react';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';
import type { AgendaBlock } from '@/hooks/useAgendaBlocks';

const EVENT_COLORS: Record<string, string> = {
  manual: 'bg-blue-500',
  automation: 'bg-amber-500',
  external: 'bg-emerald-500',
};

interface Props {
  currentMonth: Date;
  events: AgendaEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  blockedDays?: Record<string, AgendaBlock[]>;
  onEventClick?: (event: AgendaEvent, e: React.MouseEvent) => void;
}

export function AgendaCalendar({ currentMonth, events, selectedDate, onSelectDate, blockedDays = {} }: Props) {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { locale: ptBR });
    const calEnd = endOfWeek(monthEnd, { locale: ptBR });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, AgendaEvent[]> = {};
    for (const ev of events) {
      const key = format(new Date(ev.start_at), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-muted">
        {weekDays.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-t border-border">
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[key] || [];
            const dayBlocks = blockedDays[key] || [];
            const isBlocked = dayBlocks.length > 0;
            const hasAllDayBlock = dayBlocks.some(b => b.all_day);
            const inMonth = isSameMonth(day, currentMonth);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <button
                key={key}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'min-h-[80px] p-1 text-left border-r border-border last:border-r-0 transition-colors hover:bg-muted/50',
                  !inMonth && 'opacity-40',
                  selected && 'bg-primary/10 ring-1 ring-primary',
                  isBlocked && hasAllDayBlock && 'bg-destructive/5',
                )}
              >
                <div className="flex items-center gap-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                      today && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {isBlocked && (
                    <Ban className="h-3 w-3 text-destructive" />
                  )}
                </div>

                {isBlocked && (
                  <div className="mt-0.5">
                    <div className="text-[10px] leading-tight truncate rounded px-1 py-0.5 bg-destructive/10 text-destructive font-medium">
                      {hasAllDayBlock ? 'Indisponível' : dayBlocks.map(b => `${b.start_time?.slice(0,5)}-${b.end_time?.slice(0,5)}`).join(', ')}
                    </div>
                  </div>
                )}

                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, isBlocked ? 2 : 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={cn(
                        'text-[10px] leading-tight truncate rounded px-1 py-0.5 text-white',
                        EVENT_COLORS[ev.event_type] || 'bg-muted-foreground',
                      )}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > (isBlocked ? 2 : 3) && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{dayEvents.length - (isBlocked ? 2 : 3)} mais
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
