import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  windowOpen: boolean;
  userId: string;
  assessorName: string | null;
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
const fetchAllLeadsForMatch = async (): Promise<Array<{ telefone: string | null; responsavel_id: string | null }>> => {
  const pageSize = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from("leads")
      .select("telefone, responsavel_id")
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

    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .select("phone, nomewpp, user_message, bot_message, created_at, user_id")
      .eq("whatsapp_instance_name", "meta_official")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar conversas:", error);
      return;
    }

    // Nomes dos assessores
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("user_id, nome_completo");

    const profileMap = new Map<string, string>();
    for (const p of profiles || []) {
      profileMap.set(p.user_id, p.nome_completo);
    }

    // Index leads por chave normalizada -> responsavel_id (paginado)
    const leadsData = await fetchAllLeadsForMatch();


    const leadByKey = new Map<string, string>();
    for (const lead of leadsData || []) {
      if (!lead.responsavel_id) continue;
      const key = normalizeForMatch(lead.telefone);
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

      // Visibilidade para não-admin: própria OU lead atribuído a ele
      if (!isAdmin) {
        const isMine = msg.user_id === user.id;
        const isAssigned = matchKey && assignedPhones.has(matchKey);
        if (!isMine && !isAssigned) continue;
      }

      if (!map.has(normalizedPhone)) {
        const lastMessage = msg.user_message || msg.bot_message || "";
        const responsavelId = matchKey ? leadByKey.get(matchKey) : undefined;
        map.set(normalizedPhone, {
          phone: normalizedPhone,
          name: msg.nomewpp || normalizedPhone,
          lastMessage,
          lastTime: msg.created_at,
          unread: !!msg.user_message,
          userId: msg.user_id,
          assessorName: responsavelId ? profileMap.get(responsavelId) || null : null,
        });
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

    const channel = supabase
      .channel(`conversations-meta-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};
