import { useMemo } from 'react';
import { format, parseISO, getHours, getMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Ban } from 'lucide-react';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';
import type { AgendaBlock } from '@/hooks/useAgendaBlocks';
import { ScrollArea } from '@/components/ui/scroll-area';

const HOUR_HEIGHT = 64;
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
  blockedDays?: Record<string, AgendaBlock[]>;
  onEdit?: (event: AgendaEvent) => void;
  onSlotClick?: (hour: number) => void;
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
    height = Math.max(24, (diffMs / (1000 * 60 * 60)) * HOUR_HEIGHT);
  }

  return { top: Math.max(0, top), height };
}

export function AgendaDayView({ currentDate, events, blockedDays = {}, onEdit, onSlotClick }: Props) {
  const key = format(currentDate, 'yyyy-MM-dd');
  const dayBlocks = blockedDays[key] || [];

  const allDayEvents = useMemo(
    () => events.filter(ev => ev.all_day && isSameDay(parseISO(ev.start_at), currentDate)),
    [events, currentDate]
  );

  const timedEvents = useMemo(
    () => events.filter(ev => !ev.all_day && isSameDay(parseISO(ev.start_at), currentDate)),
    [events, currentDate]
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden flex flex-col">
      {/* All-day section */}
      {(allDayEvents.length > 0 || dayBlocks.some(b => b.all_day)) && (
        <div className="bg-muted/30 border-b border-border p-2">
          <div className="flex items-center gap-2 flex-wrap">
            {dayBlocks.some(b => b.all_day) && (
              <div className="flex items-center gap-1 text-xs text-destructive font-medium bg-destructive/10 rounded px-2 py-1">
                <Ban className="h-3 w-3" /> Dia indisponível
              </div>
            )}
            {allDayEvents.map(ev => (
              <div
                key={ev.id}
                className={cn('text-xs rounded px-2 py-1 text-white cursor-pointer hover:opacity-90', EVENT_COLORS[ev.event_type] || 'bg-muted-foreground')}
                onClick={() => onEdit?.(ev)}
              >
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <ScrollArea className="flex-1 max-h-[600px]">
        <div className="grid grid-cols-[60px_1fr] relative pt-2">
          {/* Hour labels */}
          <div className="relative" style={{ overflow: 'visible' }}>
            {HOURS.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span
                  className="absolute right-2 text-xs text-muted-foreground leading-none"
                  style={{ top: '-0.45em' }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="relative border-l border-border">
            {/* Hour grid lines */}
            {HOURS.map((hour) => (
              <div key={hour} className="border-t border-border" style={{ height: HOUR_HEIGHT }} />
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
                  >
                    <span className="text-[10px] text-destructive px-1">{block.reason || 'Indisponível'}</span>
                  </div>
                );
              }
              return null;
            })}

            {/* Events */}
            {timedEvents.map((ev) => {
              const pos = getEventPosition(ev);
              return (
                <div
                  key={ev.id}
                  className={cn(
                    'absolute left-1 right-1 rounded px-2 py-1 text-white text-xs overflow-hidden z-[2] cursor-pointer hover:opacity-90',
                    EVENT_COLORS[ev.event_type] || 'bg-muted-foreground',
                  )}
                  style={{ top: pos.top, height: pos.height, minHeight: 24 }}
                  onClick={() => onEdit?.(ev)}
                >
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="truncate opacity-80">
                    {format(parseISO(ev.start_at), 'HH:mm')}
                    {ev.end_at && ` - ${format(parseISO(ev.end_at), 'HH:mm')}`}
                  </div>
                  {ev.description && (
                    <div className="truncate opacity-70 mt-0.5">{ev.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
