import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export interface AgendaBlock {
  id: string;
  user_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  reason: string;
  created_at: string;
}

export interface CreateBlockData {
  user_id: string;
  block_date: string;
  start_time?: string | null;
  end_time?: string | null;
  all_day?: boolean;
  reason?: string;
}

export function useAgendaBlocks(currentMonth: Date) {
  const [blocks, setBlocks] = useState<AgendaBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const fetchBlocks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentMonth), { locale: ptBR }).toISOString().split('T')[0];
      const end = endOfWeek(endOfMonth(currentMonth), { locale: ptBR }).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('agenda_blocks')
        .select('*')
        .gte('block_date', start)
        .lte('block_date', end)
        .order('block_date', { ascending: true });

      if (error) throw error;
      setBlocks((data as AgendaBlock[]) || []);
    } catch (err) {
      console.error('Error fetching agenda blocks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    if (!user) return;
    const channelName = `agenda_blocks_${user.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_blocks' }, () => {
        fetchBlocks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBlocks]);

  const createBlock = async (data: CreateBlockData) => {
    if (!user) return false;
    const { error } = await supabase.from('agenda_blocks').insert(data as any);
    if (error) {
      if (error.code === '23505') {
        toast.error('Este bloqueio já existe para esta data/horário.');
      } else {
        toast.error('Erro ao criar bloqueio');
      }
      console.error(error);
      return false;
    }
    toast.success('Dia/horário bloqueado com sucesso!');
    await fetchBlocks();
    logActivity('agenda_block_created' as any, `Bloqueio criado: ${data.block_date}`, {
      block_date: data.block_date,
      all_day: data.all_day,
      reason: data.reason,
      user_id: data.user_id,
    });
    return true;
  };

  const deleteBlock = async (id: string) => {
    const blockToDelete = blocks.find(b => b.id === id);
    const { error } = await supabase.from('agenda_blocks').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover bloqueio');
      console.error(error);
      return false;
    }
    toast.success('Bloqueio removido!');
    await fetchBlocks();
    if (blockToDelete) {
      logActivity('agenda_block_deleted' as any, `Bloqueio removido: ${blockToDelete.block_date}`, {
        block_date: blockToDelete.block_date,
        block_id: id,
      });
    }
    return true;
  };

  // Group blocks by date for easy lookup
  const blocksByDate = blocks.reduce((acc, block) => {
    const key = block.block_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(block);
    return acc;
  }, {} as Record<string, AgendaBlock[]>);

  return { blocks, blocksByDate, loading, createBlock, deleteBlock, refetch: fetchBlocks };
}
