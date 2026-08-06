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

export interface DeliveryInfo {
  delivery_status: string | null;
  failure_reason: string | null;
}

/** Status real de entrega (webhook Meta) por meta_message_id. */
export const fetchDeliveryByMids = async (
  mids: string[],
): Promise<Record<string, DeliveryInfo>> => {
  const map: Record<string, DeliveryInfo> = {};
  for (let i = 0; i < mids.length; i += 200) {
    const chunk = mids.slice(i, i + 200);
    const { data } = await (supabase as any)
      .from("chat_messages")
      .select("meta_message_id, delivery_status, failure_reason")
      .in("meta_message_id", chunk);
    for (const m of (data as Array<
      { meta_message_id: string } & DeliveryInfo
    >) || []) {
      if (m.meta_message_id) {
        map[m.meta_message_id] = {
          delivery_status: m.delivery_status,
          failure_reason: m.failure_reason,
        };
      }
    }
  }
  return map;
};

/** Marca uma campanha travada em "enviando" como interrompida. */
export const encerrarCampanha = async (campanhaId: string) => {
  const { error } = await (supabase as any)
    .from("campanhas")
    .update({ status: "interrompida" })
    .eq("id", campanhaId);
  if (error) console.error("Erro ao encerrar campanha:", error);
  return !error;
};

/**
 * Falha recuperável = problema da conta (pagamento/elegibilidade/token), não do
 * número. Reenviar só faz sentido nesses casos; "undeliverable", bloqueio por
 * engajamento e experimentos da Meta são definitivos.
 */
export const isFalhaRecuperavel = (motivo: string | null | undefined) => {
  if (!motivo) return false;
  const m = motivo.toLowerCase();
  if (
    m.includes("undeliverable") ||
    m.includes("ecosystem") ||
    m.includes("experiment")
  ) {
    return false;
  }
  return (
    m.includes("payment") ||
    m.includes("pagamento") ||
    m.includes("eligibility") ||
    m.includes("account has been restricted") ||
    m.includes("business account") ||
    m.includes("not configured") ||
    m.includes("access token")
  );
};

export interface FalhaRecuperavel extends CampanhaDestinatario {
  motivo: string;
}

/** Destinatários da campanha cuja falha é recuperável (erro de conta na Meta). */
export const fetchFalhasRecuperaveis = async (
  campanhaId: string,
): Promise<FalhaRecuperavel[]> => {
  const rows = await fetchDestinatarios(campanhaId);
  const mids = rows.map((r) => r.meta_message_id).filter(Boolean) as string[];
  const entregas = mids.length > 0 ? await fetchDeliveryByMids(mids) : {};

  const out: FalhaRecuperavel[] = [];
  for (const d of rows) {
    if (d.status === "sem_telefone" || !d.telefone) continue;
    const info = d.meta_message_id ? entregas[d.meta_message_id] : undefined;
    // Já chegou: nunca reenviar.
    if (
      info?.delivery_status === "delivered" ||
      info?.delivery_status === "read" ||
      info?.delivery_status === "played"
    ) {
      continue;
    }
    const motivo =
      (info?.delivery_status === "failed" ? info?.failure_reason : null) ||
      (d.status === "falha" ? d.erro : null);
    if (isFalhaRecuperavel(motivo)) out.push({ ...d, motivo: motivo as string });
  }
  return out;
};

/** Atualiza o destinatário depois de um reenvio bem-sucedido ou com novo erro. */
export const atualizarDestinatarioReenvio = async (
  destinatarioId: string,
  patch: { status: string; meta_message_id?: string | null; erro?: string | null },
) => {
  const { error } = await (supabase as any)
    .from("campanha_destinatarios")
    .update({
      status: patch.status,
      meta_message_id: patch.meta_message_id ?? null,
      erro: patch.erro ?? null,
    })
    .eq("id", destinatarioId);
  if (error) console.error("Erro ao atualizar destinatário:", error);
  return !error;
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
