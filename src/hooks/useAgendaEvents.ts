import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { startOfMonth, endOfMonth } from 'date-fns';
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
}

export function useAgendaEvents(currentMonth: Date) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { role } = useUserRole();

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

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

  const createEvent = async (data: CreateEventData) => {
    if (!user) return;
    const { error } = await supabase.from('agenda_events').insert({
      ...data,
      created_by: user.id,
    } as any);
    if (error) {
      toast.error('Erro ao criar evento');
      console.error(error);
      return false;
    }
    toast.success('Evento criado com sucesso!');
    await fetchEvents();
    return true;
  };

  const updateEvent = async (id: string, data: Partial<CreateEventData>) => {
    const { error } = await supabase.from('agenda_events').update(data as any).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar evento');
      console.error(error);
      return false;
    }
    toast.success('Evento atualizado!');
    await fetchEvents();
    return true;
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('agenda_events').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir evento');
      console.error(error);
      return false;
    }
    toast.success('Evento excluído!');
    await fetchEvents();
    return true;
  };

  return { events, loading, createEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
