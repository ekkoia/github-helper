import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Campanha {
  id: string;
  nome: string;
  template_name: string | null;
  template_language: string;
  criado_por: string;
  status: string;
  total_publico: number;
  total_enviado: number;
  total_falha: number;
  total_bloqueado: number;
  created_at: string;
}

export interface CampanhaDestinatario {
  id: string;
  campanha_id: string;
  lead_id: string | null;
  nome: string | null;
  telefone: string | null;
  responsavel_id: string | null;
  status: string;
  meta_message_id: string | null;
  erro: string | null;
  created_at: string;
}

export const useCampanhas = () => {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampanhas = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("campanhas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Erro ao buscar campanhas:", error);
    setCampanhas((data as Campanha[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCampanhas();
  }, [fetchCampanhas]);

  return { campanhas, loading, refetch: fetchCampanhas };
};

export const fetchDestinatarios = async (
  campanhaId: string,
): Promise<CampanhaDestinatario[]> => {
  const { data, error } = await (supabase as any)
    .from("campanha_destinatarios")
    .select("*")
    .eq("campanha_id", campanhaId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Erro ao buscar destinatários:", error);
    return [];
  }
  return (data as CampanhaDestinatario[]) || [];
};

export interface CampanhaMetrics {
  enviado: number;
  entregue: number;
  lido: number;
  erro: number;
  bloqueado: number;
  semTelefone: number;
  semStatus: number;
}

const emptyMetrics = (): CampanhaMetrics => ({
  enviado: 0,
  entregue: 0,
  lido: 0,
  erro: 0,
  bloqueado: 0,
  semTelefone: 0,
  semStatus: 0,
});

/**
 * Métricas de entrega por campanha. Junta campanha_destinatarios.meta_message_id
 * com chat_messages.meta_message_id (status atualizado pelo webhook da Meta).
 */
export const fetchCampanhasMetrics = async (
  campanhaIds: string[],
): Promise<Record<string, CampanhaMetrics>> => {
  const result: Record<string, CampanhaMetrics> = {};
  if (campanhaIds.length === 0) return result;
  for (const id of campanhaIds) result[id] = emptyMetrics();

  const { data: dests, error } = await (supabase as any)
    .from("campanha_destinatarios")
    .select("campanha_id, status, meta_message_id")
    .in("campanha_id", campanhaIds);

  if (error) {
    console.error("Erro ao buscar métricas das campanhas:", error);
    return result;
  }

  const rows =
    (dests as Array<{
      campanha_id: string;
      status: string;
      meta_message_id: string | null;
    }>) || [];

  const mids = rows.map((r) => r.meta_message_id).filter(Boolean) as string[];
  const statusByMid = new Map<string, string>();

  for (let i = 0; i < mids.length; i += 200) {
    const chunk = mids.slice(i, i + 200);
    const { data: msgs } = await (supabase as any)
      .from("chat_messages")
      .select("meta_message_id, delivery_status")
      .in("meta_message_id", chunk);
    for (const m of (msgs as Array<{
      meta_message_id: string;
      delivery_status: string | null;
    }>) || []) {
      if (m.meta_message_id && m.delivery_status) {
        statusByMid.set(m.meta_message_id, m.delivery_status);
      }
    }
  }

  for (const r of rows) {
    const m = result[r.campanha_id];
    if (!m) continue;

    if (r.status === "bloqueado_conversa_ativa") {
      m.bloqueado += 1;
      continue;
    }
    if (r.status === "sem_telefone") {
      m.semTelefone += 1;
      continue;
    }
    if (r.status === "falha") {
      m.erro += 1;
      continue;
    }

    // enviado
    m.enviado += 1;
    const ds = r.meta_message_id ? statusByMid.get(r.meta_message_id) : null;
    if (ds === "read" || ds === "played") {
      m.lido += 1;
      m.entregue += 1;
    } else if (ds === "delivered") {
      m.entregue += 1;
    } else if (ds === "failed") {
      m.erro += 1;
    } else if (!ds) {
      m.semStatus += 1;
    }
  }

  return result;
};
