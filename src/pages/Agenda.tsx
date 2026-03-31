import { useState, useMemo, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAgendaEvents, AgendaEvent } from '@/hooks/useAgendaEvents';
import { useAgendaBlocks } from '@/hooks/useAgendaBlocks';
import { useUsers } from '@/hooks/useUsers';
import { useUserRole } from '@/hooks/useUserRole';
import { useFunilEtapas } from '@/hooks/useFunilEtapas';
import { supabase } from '@/integrations/supabase/client';
import { AgendaCalendar } from '@/components/agenda/AgendaCalendar';
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView';
import { AgendaDayView } from '@/components/agenda/AgendaDayView';
import { AgendaEventList } from '@/components/agenda/AgendaEventList';
import { AgendaEventDialog } from '@/components/agenda/AgendaEventDialog';
import { AgendaBlockDialog } from '@/components/agenda/AgendaBlockDialog';
import { AgendaEventPopover } from '@/components/agenda/AgendaEventPopover';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Ban, Calendar, CalendarRange, Clock } from 'lucide-react';
import {
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  format, startOfWeek, endOfWeek, parseISO, getHours, getMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'month' | 'week' | 'day';

const Agenda = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [defaultTime, setDefaultTime] = useState<string | null>(null);
  const [popoverEvent, setPopoverEvent] = useState<AgendaEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';
  const { users } = useUsers();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useAgendaEvents(currentDate);
  const { blocks, blocksByDate, createBlock, deleteBlock } = useAgendaBlocks(currentDate);
  const { coresMap } = useFunilEtapas();

  const [leads, setLeads] = useState<{ id: string; nome_completo: string }[]>([]);
  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, nome_completo')
        .order('nome_completo', { ascending: true })
        .limit(1000);
      setLeads(data || []);
    };
    fetchLeads();
  }, []);

  const leadsMap = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach(l => { map[l.id] = l.nome_completo; });
    return map;
  }, [leads]);

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
    setPopoverEvent(null);
    setPopoverAnchor(null);
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleEventClick = (event: AgendaEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setPopoverEvent(event);
    setPopoverAnchor({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = async (id: string) => {
    await deleteEvent(id);
  };

  const handleNewEvent = () => {
    setEditingEvent(null);
    setDefaultTime(null);
    setDialogOpen(true);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setCurrentDate(date);
    setSelectedDate(date);
    setDefaultTime(`${String(hour).padStart(2, '0')}:00`);
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const handleEventDrop = async (eventId: string, newDate: Date, newHour: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const oldStart = parseISO(event.start_at);
    const oldHour = getHours(oldStart);
    const oldMinutes = getMinutes(oldStart);

    // Calculate duration to preserve it
    let durationMs = 60 * 60 * 1000; // default 1h
    if (event.end_at) {
      durationMs = parseISO(event.end_at).getTime() - oldStart.getTime();
    }

    // Build new start preserving minutes
    const newStart = new Date(newDate);
    newStart.setHours(newHour, oldMinutes, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    await updateEvent(eventId, {
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      title: event.title,
      user_id: event.user_id,
    });
  };

  // Navigation
  const goBack = () => {
    if (viewMode === 'month') setCurrentDate(m => subMonths(m, 1));
    else if (viewMode === 'week') setCurrentDate(m => subWeeks(m, 1));
    else setCurrentDate(m => subDays(m, 1));
  };

  const goForward = () => {
    if (viewMode === 'month') setCurrentDate(m => addMonths(m, 1));
    else if (viewMode === 'week') setCurrentDate(m => addWeeks(m, 1));
    else setCurrentDate(m => addDays(m, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const navTitle = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { locale: ptBR });
      const we = endOfWeek(currentDate, { locale: ptBR });
      return `${format(ws, 'd')}–${format(we, 'd MMM yyyy', { locale: ptBR })}`;
    }
    return format(currentDate, "d 'de' MMMM, EEEE", { locale: ptBR });
  }, [currentDate, viewMode]);

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === 'month') {
      setCurrentDate(date);
      setViewMode('day');
    } else if (viewMode === 'week') {
      setCurrentDate(date);
      setViewMode('day');
    }
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

        {/* Navigation + View Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goForward}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize ml-2">
              {navTitle}
            </h2>
          </div>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border border-border rounded-lg"
          >
            <ToggleGroupItem value="month" aria-label="Mês" className="px-3 gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Mês</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="week" aria-label="Semana" className="px-3 gap-1">
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Semana</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="day" aria-label="Dia" className="px-3 gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Dia</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Calendar views + side panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {viewMode === 'month' && (
            <AgendaCalendar
              currentMonth={currentDate}
              events={filteredEvents}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              blockedDays={blocksByDate}
              onEventClick={handleEventClick}
            />
          )}

          {viewMode === 'week' && (
            <AgendaWeekView
              currentDate={currentDate}
              events={filteredEvents}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              blockedDays={blocksByDate}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}

          {viewMode === 'day' && (
            <AgendaDayView
              currentDate={currentDate}
              events={filteredEvents}
              blockedDays={blocksByDate}
              onEdit={handleEdit}
              onSlotClick={(hour) => handleSlotClick(currentDate, hour)}
              onEventClick={handleEventClick}
            />
          )}

          <div className="bg-card border border-border rounded-lg p-4">
            <AgendaEventList
              date={viewMode === 'day' ? currentDate : selectedDate}
              events={filteredEvents}
              onEdit={handleEdit}
              onDelete={handleDelete}
              usersMap={usersMap}
              blocks={blocks}
              onDeleteBlock={deleteBlock}
              leadsMap={leadsMap}
              coresMap={coresMap}
            />
          </div>
        </div>
      </div>

      <AgendaEventDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDefaultTime(null);
        }}
        event={editingEvent}
        defaultDate={viewMode === 'day' ? currentDate : selectedDate}
        usersMap={usersMap}
        onSave={createEvent}
        onUpdate={updateEvent}
        blockedDays={blocksByDate}
        leads={leads}
        defaultTime={defaultTime}
      />

      <AgendaBlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        defaultDate={viewMode === 'day' ? currentDate : selectedDate}
        usersMap={usersMap}
        onSave={createBlock}
      />

      {popoverEvent && popoverAnchor && (
        <AgendaEventPopover
          event={popoverEvent}
          anchor={popoverAnchor}
          onClose={() => { setPopoverEvent(null); setPopoverAnchor(null); }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          usersMap={usersMap}
          leadsMap={leadsMap}
          coresMap={coresMap}
        />
      )}
    </Layout>
  );
};

export default Agenda;
