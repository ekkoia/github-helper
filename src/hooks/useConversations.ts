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

    // Agrupar por phone normalizado (sem +, só dígitos)
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
        });
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
