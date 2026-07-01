import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export interface Conversation {
  phone: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
  userId: string;
  assessorName: string | null;
}

export const useConversations = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    let query = (supabase as any)
      .from("chat_messages")
      .select("phone, nomewpp, user_message, bot_message, created_at, user_id")
      .eq("whatsapp_instance_name", "meta_official")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) { console.error("Erro ao buscar conversas:", error); return; }

    // Busca nomes dos assessores
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("user_id, nome_completo");

    const profileMap = new Map<string, string>();
    for (const p of profiles || []) {
      profileMap.set(p.user_id, p.nome_completo);
    }

    // Agrupar por phone normalizado
    const map = new Map<string, Conversation>();
    for (const msg of data || []) {
      const normalizedPhone = msg.phone.replace(/\D/g, "");
      if (!map.has(normalizedPhone)) {
        const lastMessage = msg.user_message || msg.bot_message || "";
        map.set(normalizedPhone, {
          phone: normalizedPhone,
          name: msg.nomewpp || normalizedPhone,
          lastMessage,
          lastTime: msg.created_at,
          unread: !!msg.user_message,
          userId: msg.user_id,
          assessorName: null, // preenchido abaixo
        });
      }
    }

    // Só mostra assessor se o lead está atribuído (responsavel_id em leads)
    if (isAdmin && phones.length > 0) {
      // Busca responsavel_id da tabela leads por telefone
      const { data: leadsData } = await (supabase as any)
        .from("leads")
        .select("telefone, responsavel_id");

      for (const lead of leadsData || []) {
        const normalizedLeadPhone = (lead.telefone || "").replace(/\D/g, "");
        if (!normalizedLeadPhone || !lead.responsavel_id) continue;

        // Procura conversa com esse telefone (últimos 8 dígitos)
        for (const [phone, conv] of map.entries()) {
          if (phone.slice(-8) === normalizedLeadPhone.slice(-8)) {
            conv.assessorName = profileMap.get(lead.responsavel_id) || null;
            break;
          }
        }
      }
    }

    setConversations(Array.from(map.values()));
    setLoading(false);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Realtime
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
          filter: isAdmin ? undefined : `user_id=eq.${user.id}`,
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, isAdmin, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};
