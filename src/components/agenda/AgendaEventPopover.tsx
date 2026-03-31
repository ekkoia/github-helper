import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Pencil, Trash2, Clock, Bell, User, UserCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';

const EVENT_TYPE_COLORS: Record<string, string> = {
  manual: '#3b82f6',
  automation: '#f59e0b',
  external: '#10b981',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  automation: 'Automação',
  external: 'Externo',
};

interface Props {
  event: AgendaEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
  onEdit: (event: AgendaEvent) => void;
  onDelete: (id: string) => void;
  usersMap: Record<string, string>;
  leadsMap: Record<string, string>;
  coresMap: Record<string, string>;
}

export function AgendaEventPopover({ event, anchor, onClose, onEdit, onDelete, usersMap, leadsMap, coresMap }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Position the popover within viewport
  const style = (() => {
    const popW = 340;
    const popH = 320;
    let x = anchor.x + 8;
    let y = anchor.y + 8;

    if (typeof window !== 'undefined') {
      if (x + popW > window.innerWidth - 16) x = anchor.x - popW - 8;
      if (y + popH > window.innerHeight - 16) y = window.innerHeight - popH - 16;
      if (x < 16) x = 16;
      if (y < 16) y = 16;
    }

    return { left: x, top: y };
  })();

  const startDate = parseISO(event.start_at);
  const dateStr = format(startDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const startTime = format(startDate, 'HH:mm');
  const endTime = event.end_at ? format(parseISO(event.end_at), 'HH:mm') : null;
  const typeColor = EVENT_TYPE_COLORS[event.event_type] || '#6b7280';

  const etapaFunil = event.metadata?.etapa_funil as string | undefined;
  const leadName = event.lead_id ? leadsMap[event.lead_id] : null;
  const assessorName = usersMap[event.user_id] || 'Desconhecido';
  const reminderMinutes = (event as any).reminder_minutes;

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-[340px] bg-card border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
      style={style}
    >
      {/* Header actions */}
      <div className="flex items-center justify-end gap-1 px-3 pt-3 pb-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onClose(); onEdit(event); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { onClose(); onDelete(event.id); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 space-y-3">
        {/* Title + type dot */}
        <div className="flex items-start gap-3">
          <div className="mt-1.5 w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: typeColor }} />
          <div>
            <h3 className="text-base font-semibold text-foreground leading-snug">{event.title}</h3>
            <span className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</span>
          </div>
        </div>

        {/* Date/time */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="capitalize">{dateStr}</span>
            {!event.all_day && (
              <span className="ml-1">· {startTime}{endTime ? ` – ${endTime}` : ''}</span>
            )}
            {event.all_day && <span className="ml-1">· Dia inteiro</span>}
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground pl-6 leading-relaxed">{event.description}</p>
        )}

        {/* Reminder */}
        {reminderMinutes != null && reminderMinutes > 0 && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{reminderMinutes} minutos antes</span>
          </div>
        )}

        {/* Lead */}
        {leadName && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{leadName}</span>
          </div>
        )}

        {/* Funnel stage */}
        {etapaFunil && (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: coresMap[etapaFunil] || '#6b7280' }} />
              <span>{etapaFunil}</span>
            </div>
          </div>
        )}

        {/* Assessor */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{assessorName}</span>
        </div>
      </div>
    </div>
  );
}
