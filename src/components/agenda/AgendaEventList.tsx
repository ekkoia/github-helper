import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2, Clock, CalendarDays, Ban } from 'lucide-react';
import type { AgendaEvent } from '@/hooks/useAgendaEvents';
import type { AgendaBlock } from '@/hooks/useAgendaBlocks';

const TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  automation: 'Automação',
  external: 'Externo',
};

const TYPE_COLORS: Record<string, string> = {
  manual: 'bg-blue-500/10 text-blue-700 border-blue-200',
  automation: 'bg-amber-500/10 text-amber-700 border-amber-200',
  external: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
};

interface Props {
  date: Date | null;
  events: AgendaEvent[];
  onEdit: (event: AgendaEvent) => void;
  onDelete: (id: string) => void;
  usersMap: Record<string, string>;
  blocks?: AgendaBlock[];
  onDeleteBlock?: (id: string) => void;
  leadsMap?: Record<string, string>;
  coresMap?: Record<string, string>;
}

export function AgendaEventList({ date, events, onEdit, onDelete, usersMap, blocks = [], onDeleteBlock, leadsMap = {}, coresMap = {} }: Props) {
  if (!date) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <CalendarDays className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">Selecione um dia no calendário</p>
      </div>
    );
  }

  const dateKey = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(
    (ev) => format(new Date(ev.start_at), 'yyyy-MM-dd') === dateKey
  );
  const dayBlocks = blocks.filter(b => b.block_date === dateKey);

  return (
    <div>
      <h3 className="text-base font-semibold mb-3">
        {format(date, "dd 'de' MMMM, EEEE", { locale: ptBR })}
      </h3>

      {/* Blocks */}
      {dayBlocks.length > 0 && (
        <div className="space-y-2 mb-3">
          {dayBlocks.map((block) => (
            <Card key={block.id} className="p-3 border-destructive/30 bg-destructive/5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      <Ban className="h-3 w-3 mr-1" />
                      Indisponível
                    </Badge>
                  </div>
                  {block.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">{block.reason}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {block.all_day
                      ? 'Dia inteiro'
                      : `${block.start_time?.slice(0, 5)} - ${block.end_time?.slice(0, 5)}`}
                  </div>
                  {usersMap[block.user_id] && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      👤 {usersMap[block.user_id]}
                    </p>
                  )}
                </div>
                {onDeleteBlock && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onDeleteBlock(block.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {dayEvents.length === 0 && dayBlocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
      ) : dayEvents.length === 0 ? null : (
        <div className="space-y-2">
          {dayEvents.map((ev) => (
            <Card key={ev.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={TYPE_COLORS[ev.event_type] || ''}>
                      {TYPE_LABELS[ev.event_type] || ev.event_type}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{ev.title}</p>
                  {ev.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {ev.all_day
                      ? 'Dia inteiro'
                      : format(new Date(ev.start_at), 'HH:mm') +
                        (ev.end_at ? ` - ${format(new Date(ev.end_at), 'HH:mm')}` : '')}
                  </div>
                  {usersMap[ev.user_id] && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      👤 {usersMap[ev.user_id]}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {ev.event_type === 'manual' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(ev)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(ev.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
