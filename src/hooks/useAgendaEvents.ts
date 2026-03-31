import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useActivityLog } from '@/hooks/useActivityLog';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export interface AgendaEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  lead_id: string | null;
  user_id: string;
  created_by: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  event_type?: string;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  lead_id?: string | null;
  user_id: string;
  reminder_minutes?: number;
  metadata?: Record<string, any>;
}

export function useAgendaEvents(currentMonth: Date) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { role } = useUserRole();
  const { logActivity } = useActivityLog();

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR }).toISOString();
      const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR }).toISOString();

      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .gte('start_at', start)
        .lte('start_at', end)
        .order('start_at', { ascending: true });

      if (error) throw error;
      setEvents((data as AgendaEvent[]) || []);
    } catch (err) {
      console.error('Error fetching agenda events:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channelName = `agenda_events_${user.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchEvents]);

  const sendAgendaNotification = async (
    eventUserId: string,
    eventTitle: string,
    eventStartAt: string,
    eventDescription: string | undefined,
    action: 'created' | 'updated' | 'deleted'
  ) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, nome_completo')
        .eq('user_id', eventUserId)
        .single();

      if (!profile) return;

      const startDate = new Date(eventStartAt);
      const eventDate = startDate.toLocaleDateString('pt-BR');
      const eventTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await supabase.functions.invoke('send-agenda-email', {
        body: {
          to_email: profile.email,
          nome_assessor: profile.nome_completo || 'Assessor',
          event_title: eventTitle,
          event_date: eventDate,
          event_time: eventTime,
          event_description: eventDescription || '',
          action,
          user_id: eventUserId,
        },
      });
    } catch (err) {
      console.error('Error sending agenda notification:', err);
    }
  };

  const createEvent = async (data: CreateEventData) => {
    if (!user) return;
    const { metadata, ...rest } = data;
    const { error } = await supabase.from('agenda_events').insert({
      ...rest,
      metadata: metadata || {},
      created_by: user.id,
    } as any);
    if (error) {
      toast.error('Erro ao criar evento');
      console.error(error);
      return false;
    }
    toast.success('Evento criado com sucesso!');
    await fetchEvents();
    sendAgendaNotification(data.user_id, data.title, data.start_at, data.description, 'created');
    logActivity('agenda_created', `Evento criado: ${data.title}`, { event_title: data.title, start_at: data.start_at, user_id: data.user_id });
    return true;
  };

  const updateEvent = async (id: string, data: Partial<CreateEventData>) => {
    const { metadata, ...rest } = data;
    const updatePayload = { ...rest, ...(metadata !== undefined ? { metadata } : {}) };
    const { error } = await supabase.from('agenda_events').update(updatePayload as any).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar evento');
      console.error(error);
      return false;
    }
    toast.success('Evento atualizado!');
    await fetchEvents();
    if (data.user_id && data.title && data.start_at) {
      sendAgendaNotification(data.user_id, data.title, data.start_at, data.description, 'updated');
    }
    logActivity('agenda_updated', `Evento atualizado: ${data.title || 'sem título'}`, { event_id: id, event_title: data.title });
    return true;
  };

  const deleteEvent = async (id: string) => {
    // Get event data before deleting for notification
    const eventToDelete = events.find(e => e.id === id);
    const { error } = await supabase.from('agenda_events').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir evento');
      console.error(error);
      return false;
    }
    toast.success('Evento excluído!');
    await fetchEvents();
    if (eventToDelete) {
      sendAgendaNotification(eventToDelete.user_id, eventToDelete.title, eventToDelete.start_at, eventToDelete.description || undefined, 'deleted');
      logActivity('agenda_deleted', `Evento excluído: ${eventToDelete.title}`, { event_id: id, event_title: eventToDelete.title });
    }
    return true;
  };

  return { events, loading, createEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
