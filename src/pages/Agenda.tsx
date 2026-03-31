import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAgendaEvents, AgendaEvent } from '@/hooks/useAgendaEvents';
import { useAgendaBlocks } from '@/hooks/useAgendaBlocks';
import { useUsers } from '@/hooks/useUsers';
import { useUserRole } from '@/hooks/useUserRole';
import { useFunilEtapas } from '@/hooks/useFunilEtapas';
import { supabase } from '@/integrations/supabase/client';
import { AgendaCalendar } from '@/components/agenda/AgendaCalendar';
import { AgendaEventList } from '@/components/agenda/AgendaEventList';
import { AgendaEventDialog } from '@/components/agenda/AgendaEventDialog';
import { AgendaBlockDialog } from '@/components/agenda/AgendaBlockDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Ban } from 'lucide-react';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Agenda = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';
  const { users } = useUsers();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useAgendaEvents(currentMonth);
  const { blocks, blocksByDate, createBlock, deleteBlock } = useAgendaBlocks(currentMonth);

  const usersMap = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u: any) => {
      map[u.user_id] = u.nome_completo || u.email || 'Sem nome';
    });
    return map;
  }, [users]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterType !== 'all') {
      filtered = filtered.filter((e) => e.event_type === filterType);
    }
    if (filterUser !== 'all') {
      filtered = filtered.filter((e) => e.user_id === filterUser);
    }
    return filtered;
  }, [events, filterType, filterUser]);

  const handleEdit = (event: AgendaEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
  };

  const handleNewEvent = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">Calendário de eventos e agendamentos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="automation">Automação</SelectItem>
                <SelectItem value="external">Externo</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Assessor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos assessores</SelectItem>
                  {Object.entries(usersMap).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="outline" onClick={() => setBlockDialogOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Bloquear dia
            </Button>

            <Button onClick={handleNewEvent}>
              <Plus className="h-4 w-4 mr-1" /> Novo evento
            </Button>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar + side panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <AgendaCalendar
            currentMonth={currentMonth}
            events={filteredEvents}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            blockedDays={blocksByDate}
          />

          <div className="bg-card border border-border rounded-lg p-4">
            <AgendaEventList
              date={selectedDate}
              events={filteredEvents}
              onEdit={handleEdit}
              onDelete={handleDelete}
              usersMap={usersMap}
              blocks={blocks}
              onDeleteBlock={deleteBlock}
            />
          </div>
        </div>
      </div>

      <AgendaEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        usersMap={usersMap}
        onSave={createEvent}
        onUpdate={updateEvent}
        blockedDays={blocksByDate}
      />

      <AgendaBlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        defaultDate={selectedDate}
        usersMap={usersMap}
        onSave={createBlock}
      />
    </Layout>
  );
};

export default Agenda;
