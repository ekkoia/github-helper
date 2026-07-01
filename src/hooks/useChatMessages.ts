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
  meta_account_id: string | null;
  user_id: string | null;
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
      .select("id, phone, nomewpp, user_message, bot_message, message_type, message_direction, media_type, media_url, media_mime_type, media_filename, meta_account_id, user_id, created_at")
      .eq("whatsapp_instance_name", "meta_official")
      .like("phone", `%${cleanPhone.slice(-8)}`)
      .order("created_at", { ascending: true });

    // Para admin: vê tudo
    // Para assessor: vê todas as mensagens do lead se ele estiver atribuído,
    // caso contrário filtra por user_id (segurança)
    if (!isAdmin) {
      const cleanPhoneForLead = phone.replace(/\D/g, "");
      const { data: assignedLead } = await (supabase as any)
        .from("leads")
        .select("id")
        .eq("responsavel_id", user.id)
        .like("telefone", `%${cleanPhoneForLead.slice(-8)}`)
        .limit(1)
        .maybeSingle();

      if (!assignedLead) {
        // Não está atribuído — só vê mensagens que ele mesmo enviou
        query = query.eq("user_id", user.id);
      }
      // Se está atribuído — não aplica filtro, vê todo o histórico do número
    }
    const { data, error } = await query;
    if (error) { console.error("Erro ao buscar mensagens:", error); }
    setMessages((data || []).filter((m: any) => m.user_message || m.bot_message || m.media_url));
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
          const msgPhone = (msg.phone || "").replace(/\D/g, "");
          if (msg.whatsapp_instance_name !== "meta_official") return;
          if (!msgPhone.includes(cleanPhone.slice(-8)) && !cleanPhone.includes(msgPhone.slice(-8))) return;
          // Não filtra por user_id aqui — segurança está na lista de conversas
          setMessages((prev) => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [phone, user?.id, isAdmin]);

  return { messages, loading, refetch: fetchMessages };
};
