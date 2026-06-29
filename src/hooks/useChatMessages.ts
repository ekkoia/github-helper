import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export interface ChatMessage {
  id: string;
  phone: string;
  nomewpp: string | null;
  user_message: string | null;
  bot_message: string | null;
  message_type: string | null;
  message_direction: string | null;
  media_type: string | null;
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  created_at: string;
}

export const useChatMessages = (phone: string | null) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!phone || !user?.id) return;

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");

    let query = (supabase as any)
      .from("chat_messages")
      .select("id, phone, nomewpp, user_message, bot_message, message_type, message_direction, media_type, media_url, media_mime_type, media_filename, created_at")
      .eq("whatsapp_instance_name", "meta_official")
      .like("phone", `%${cleanPhone.slice(-8)}`)
      .order("created_at", { ascending: true });

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }
    const { data, error } = await query;
    if (error) { console.error("Erro ao buscar mensagens:", error); }
    setMessages(data || []);
    setLoading(false);
  }, [phone, user?.id, isAdmin]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!phone || !user?.id) return;

    const channel = supabase
      .channel(`chat-${phone}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload: any) => {
          const msg = payload.new;
          const cleanPhone = phone.replace(/\D/g, "");
          if (msg.whatsapp_instance_name !== "meta_official") return;
          if (!msg.phone?.includes(cleanPhone.slice(-8))) return;
          if (!isAdmin && msg.user_id !== user.id) return;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [phone, user?.id, isAdmin]);

  return { messages, loading, refetch: fetchMessages };
};
