import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  nome_completo: string | null;
  telefone: string | null;
  email: string | null;
  etapa_funil: string | null;
  responsavel_id: string | null;
  nota_assessor: string | null;
  origem: string | null;
  data_criacao: string | null;
  faixa_investimento: string | null;
  investimento_real: number | null;
}

export interface FunilEtapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

export const useLeadByPhone = (phone: string | null) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLead = useCallback(async () => {
    if (!phone) { setLead(null); setLoading(false); return; }
    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");

    const { data, error } = await (supabase as any)
      .from("leads")
      .select("*")
      .like("telefone", `%${cleanPhone.slice(-8)}`)
      .order("data_criacao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.error("Erro ao buscar lead:", error);
    setLead(data || null);
    setLoading(false);
  }, [phone]);

  const fetchEtapas = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("funil_etapas")
      .select("id, nome, cor, ordem, ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true });
    setEtapas(data || []);
  }, []);

  useEffect(() => { fetchLead(); }, [fetchLead]);
  useEffect(() => { fetchEtapas(); }, [fetchEtapas]);

  const updateLead = async (updates: Partial<Lead>) => {
    if (!lead?.id) return false;
    const { error } = await (supabase as any)
      .from("leads")
      .update({ ...updates, data_atualizacao: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) { console.error("Erro ao atualizar lead:", error); return false; }
    setLead((prev) => (prev ? { ...prev, ...updates } : prev));
    return true;
  };

  // etapa_funil em `leads` é o NOME da etapa (texto), não o id de funil_etapas
  const updateEtapa = async (etapaNome: string) => updateLead({ etapa_funil: etapaNome });

  return { lead, etapas, loading, refetch: fetchLead, updateLead, updateEtapa };
};
