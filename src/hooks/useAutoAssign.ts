import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutoAssignEntry {
  id: string;
  user_id: string;
  faixa: 'ate_10k' | '10k_50k' | '50k_150k' | 'acima_150k';
  ordem: number;
  ativo: boolean;
}

export const useAutoAssign = () => {
  const [config, setConfig] = useState<AutoAssignEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('auto_assign_config')
      .select('*')
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Error fetching auto assign config:', error);
      toast.error('Erro ao carregar configuração de distribuição');
    } else {
      setConfig((data as AutoAssignEntry[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const addUser = async (userId: string, faixa: 'ate_10k' | '10k_50k' | '50k_150k' | 'acima_150k') => {
    // Get max order for this faixa
    const currentMax = config
      .filter(c => c.faixa === faixa)
      .reduce((max, c) => Math.max(max, c.ordem), 0);

    const { error } = await supabase
      .from('auto_assign_config')
      .insert({ user_id: userId, faixa, ordem: currentMax + 1, ativo: true });

    if (error) {
      if (error.code === '23505') {
        toast.error('Usuário já está nessa fila');
      } else {
        console.error('Error adding user:', error);
        toast.error('Erro ao adicionar usuário');
      }
      return false;
    }
    toast.success('Usuário adicionado à fila');
    await fetchConfig();
    return true;
  };

  const removeUser = async (id: string) => {
    const { error } = await supabase
      .from('auto_assign_config')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error removing user:', error);
      toast.error('Erro ao remover usuário');
      return false;
    }
    toast.success('Usuário removido da fila');
    await fetchConfig();
    return true;
  };

  const toggleUser = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from('auto_assign_config')
      .update({ ativo })
      .eq('id', id);

    if (error) {
      console.error('Error toggling user:', error);
      toast.error('Erro ao atualizar status');
      return false;
    }
    await fetchConfig();
    return true;
  };

  const reorderUsers = async (faixa: 'ate_10k' | '10k_50k' | '50k_150k' | 'acima_150k', orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('auto_assign_config')
        .update({ ordem: index + 1 })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error('Erro ao reordenar fila');
      return false;
    }
    await fetchConfig();
    return true;
  };

  const getByFaixa = (faixa: 'ate_10k' | '10k_50k' | '50k_150k' | 'acima_150k') =>
    config.filter(c => c.faixa === faixa).sort((a, b) => a.ordem - b.ordem);

  return {
    config,
    loading,
    addUser,
    removeUser,
    toggleUser,
    reorderUsers,
    getByFaixa,
    refetch: fetchConfig,
  };
};
