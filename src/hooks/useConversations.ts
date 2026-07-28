import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  lastMediaType: string | null;
  lastMediaFilename: string | null;
  windowOpen: boolean;
  userId: string;
  assessorName: string | null;
  assessorId: string | null;
  leadId: string | null;
  hasAssessorMessage: boolean;
}

/**
 * Normaliza telefone apenas para comparação (não altera dados no banco).
 * Remove tudo que não for dígito, ignora prefixo 55 quando há 12-13 dígitos,
 * e retorna os últimos 10 dígitos (DDD + número, sem o 9 opcional).
 */
const normalizeForMatch = (raw: string | null | undefined): string => {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Remove DDI 55 (celular 13 dígitos ou fixo 12 dígitos)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  // Se tem 11 dígitos (DDD + 9 + 8) e o 3º é 9, remove o 9 do celular
  // para casar com números salvos sem o 9.
  if (digits.length === 11 && digits[2] === "9") {
    digits = digits.slice(0, 2) + digits.slice(3);
  }
  // Retorna os últimos 10 dígitos (DDD + 8 dígitos)
  return digits.slice(-10);
};

// Busca todos os leads paginando (contorna limite de 1000 do PostgREST)
const fetchAllLeadsForMatch = async (): Promise<Array<{ id: string; telefone: string | null; responsavel_id: string | null }>> => {
  const pageSize = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from("leads")
      .select("id, telefone, responsavel_id")
      .order("data_criacao", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Erro ao buscar leads para match:", error);
      break;
    }
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
};

export const useConversations = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    // Para não-admin: telefones dos leads atribuídos a ele (chaves normalizadas)
    const assignedPhones: Set<string> = new Set();
    if (!isAdmin) {
      const { data: myLeads } = await (supabase as any)
        .from("leads")
        .select("telefone")
        .eq("responsavel_id", user.id);
      for (const l of myLeads || []) {
        const n = normalizeForMatch(l.telefone);
        if (n) assignedPhones.add(n);
      }
    }

    const [{ data, error }, { data: windows }, { data: profiles }] = await Promise.all([
      (supabase as any)
        .from("chat_messages")
        .select("phone, nomewpp, user_message, bot_message, media_type, media_filename, created_at, user_id")
        .eq("whatsapp_instance_name", "meta_official")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("whatsapp_conversation_windows")
        .select("phone_e164, expires_at"),
      (supabase as any)
        .from("profiles")
        .select("user_id, nome_completo"),
    ]);

    if (error) {
      console.error("Erro ao buscar conversas:", error);
      return;
    }

    const nowMs = Date.now();
    const windowByPhone = new Map<string, number>();
    const windowByMatch = new Map<string, number>();
    for (const w of windows || []) {
      if (w.expires_at) {
        const exp = new Date(w.expires_at).getTime();
        windowByPhone.set(w.phone_e164, exp);
        const key = normalizeForMatch(w.phone_e164);
        if (key) windowByMatch.set(key, Math.max(windowByMatch.get(key) || 0, exp));
      }
    }

    const profileMap = new Map<string, string>();
    for (const p of profiles || []) {
      profileMap.set(p.user_id, p.nome_completo);
    }

    // Index leads por chave normalizada -> responsavel_id (paginado)
    const leadsData = await fetchAllLeadsForMatch();


    const leadByKey = new Map<string, string>();
    const leadIdByKey = new Map<string, string>();
    const leadPhoneByKey = new Map<string, string>();
    for (const lead of leadsData || []) {
      const key = normalizeForMatch(lead.telefone);
      const canonicalPhone = (lead.telefone || "").replace(/\D/g, "");
      if (key && canonicalPhone && !leadPhoneByKey.has(key)) {
        leadPhoneByKey.set(key, canonicalPhone);
      }
      if (key && lead.id && !leadIdByKey.has(key)) {
        leadIdByKey.set(key, lead.id);
      }
      if (!lead.responsavel_id) continue;
      if (key && !leadByKey.has(key)) {
        leadByKey.set(key, lead.responsavel_id);
      }
    }

    // Agrupar por phone
    const map = new Map<string, Conversation>();
    for (const msg of data || []) {
      const normalizedPhone = (msg.phone || "").replace(/\D/g, "");
      if (!normalizedPhone) continue;

      const matchKey = normalizeForMatch(msg.phone);

      // Visibilidade para não-admin: apenas conversas de leads atribuídos a ele.
      // (Não usar msg.user_id === user.id como fallback, pois disparos em massa
      // gravam user_id do remetente e fariam conversas de outros assessores
      // aparecerem indevidamente.)
      if (!isAdmin) {
        const isAssigned = matchKey && assignedPhones.has(matchKey);
        if (!isAssigned) continue;
      }

      const displayPhone = (matchKey ? leadPhoneByKey.get(matchKey) : undefined) || normalizedPhone;

      if (!map.has(displayPhone)) {
        const lastMessage = msg.user_message || msg.bot_message || "";
        const responsavelId = matchKey ? leadByKey.get(matchKey) : undefined;
        const expMs = windowByPhone.get(displayPhone) ?? windowByPhone.get(normalizedPhone) ?? (matchKey ? windowByMatch.get(matchKey) : undefined);
        map.set(displayPhone, {
          phone: displayPhone,
          name: msg.nomewpp || normalizedPhone,
          lastMessage,
          lastTime: msg.created_at,
          lastMediaType: msg.media_type ?? null,
          lastMediaFilename: msg.media_filename ?? null,
          windowOpen: expMs != null && expMs > nowMs,
          userId: msg.user_id,
          assessorName: responsavelId ? profileMap.get(responsavelId) || null : null,
          assessorId: responsavelId || null,
          leadId: matchKey ? leadIdByKey.get(matchKey) || null : null,
          hasAssessorMessage: false,
        });
      }

      // Marca se algum message deste phone foi enviado pelo assessor responsável
      const conv = map.get(displayPhone);
      if (conv && conv.assessorId && msg.user_id === conv.assessorId && msg.bot_message) {
        conv.hasAssessorMessage = true;
      }
    }

    setConversations(Array.from(map.values()));
    setLoading(false);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user?.id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      const channelName = `conversations-meta-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          () => fetchConversations()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "whatsapp_conversation_windows" },
          () => fetchConversations()
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "leads" },
          () => fetchConversations()
        )
        .subscribe();
    } catch (error) {
      console.error("Erro ao assinar conversas em tempo real:", error);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};
