import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { normalizePhoneForMatch } from "@/lib/phoneMatch";

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

const LEAD_COLUMNS =
  "id,nome_completo,telefone,email,etapa_funil,responsavel_id,nota_assessor,origem,data_criacao,faixa_investimento,investimento_real";

export const useLeadByPhone = (phone: string | null) => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [lead, setLead] = useState<Lead | null>(null);
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLead = useCallback(async () => {
    if (!phone) { setLead(null); setLoading(false); return; }
    if (!user?.id || roleLoading) return;
    setLoading(true);
    const matchKey = normalizePhoneForMatch(phone);

    try {
      // 1) Consulta direta por telefone_key (indexado e batido pelo trigger de normalização)
      let q = (supabase as any)
        .from("leads")
        .select(LEAD_COLUMNS)
        .eq("telefone_key", matchKey)
        .order("data_criacao", { ascending: false })
        .limit(1);

      if (!isAdmin) q = q.eq("responsavel_id", user.id);

      const { data, error } = await q.maybeSingle();
      if (error) throw error;

      if (data) {
        setLead(data as Lead);
      } else {
        // 2) Fallback para leads antigos sem telefone_key: casa pelos últimos 8 dígitos
        const suffix = matchKey.slice(-8);
        let q2 = (supabase as any)
          .from("leads")
          .select(LEAD_COLUMNS)
          .ilike("telefone", `%${suffix}`)
          .order("data_criacao", { ascending: false })
          .limit(1);
        if (!isAdmin) q2 = q2.eq("responsavel_id", user.id);
        const { data: fallback } = await q2.maybeSingle();
        setLead((fallback as Lead) || null);
      }
    } catch (error) {
      console.error("Erro ao buscar lead:", error);
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [phone, user?.id, isAdmin, roleLoading]);

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

  const updateEtapa = async (etapaNome: string) => updateLead({ etapa_funil: etapaNome });

  return { lead, etapas, loading, refetch: fetchLead, updateLead, updateEtapa };
};
