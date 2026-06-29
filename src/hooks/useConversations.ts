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

    // Só mostra assessor se ele enviou pelo menos uma mensagem outbound pelo CRM
    // Busca mensagens outbound por phone agrupadas por user_id
    const phones = Array.from(map.keys());
    if (phones.length > 0 && isAdmin) {
      const { data: outboundMsgs } = await (supabase as any)
        .from("chat_messages")
        .select("phone, user_id")
        .eq("whatsapp_instance_name", "meta_official")
        .eq("message_direction", "outbound")
        .not("meta_account_id", "is", null)
        .not("user_id", "is", null);

      for (const msg of outboundMsgs || []) {
        const normalizedPhone = msg.phone.replace(/\D/g, "");
        const conv = map.get(normalizedPhone);
        if (conv && msg.user_id && profileMap.has(msg.user_id)) {
          conv.assessorName = profileMap.get(msg.user_id) || null;
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
