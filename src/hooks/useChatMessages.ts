import { useState, useEffect, useCallback, useRef } from "react";
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
  meta_message_id?: string | null;
  delivery_status?: string | null;
  failure_reason?: string | null;
  // Optimistic UI (client-only)
  status?: "pending" | "sent" | "failed";
  __retry?: () => void;
}

export const useChatMessages = (phone: string | null) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<ChatMessage[]>([]);

  // Mantém ref sincronizada para uso no handler realtime
  useEffect(() => {
    pendingRef.current = messages.filter((m) => m.status === "pending" || m.status === "failed");
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    if (!phone || !user?.id) return;

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");

    let query = (supabase as any)
      .from("chat_messages")
      .select("id, phone, nomewpp, user_message, bot_message, message_type, message_direction, media_type, media_url, media_mime_type, media_filename, meta_account_id, user_id, created_at, meta_message_id, delivery_status, failure_reason")
      .eq("whatsapp_instance_name", "meta_official")
      .like("phone", `%${cleanPhone.slice(-8)}`)
      .order("created_at", { ascending: true });

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
        query = query.eq("user_id", user.id);
      }
    }
    const { data, error } = await query;
    if (error) { console.error("Erro ao buscar mensagens:", error); }
    const serverMsgs = (data || []).filter((m: any) => m.user_message || m.bot_message || m.media_url);
    // Preserva otimistas ainda pendentes (não reconciliadas)
    setMessages((prev) => {
      const stillPending = prev.filter((m) => m.status === "pending" || m.status === "failed");
      return [...serverMsgs, ...stillPending];
    });
    setLoading(false);
  }, [phone, user?.id, isAdmin]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateOptimistic = useCallback((tempId: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, ...patch } : m)));
  }, []);

  const removeOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  // Reconciliação: quando chega INSERT do servidor, tenta casar com pendente
  const reconcile = useCallback((serverMsg: ChatMessage) => {
    setMessages((prev) => {
      // Já existe (mesmo id)?
      if (prev.find((m) => m.id === serverMsg.id)) return prev;
      // Tenta casar com um pendente similar
      const idx = prev.findIndex((m) => {
        if (m.status !== "pending" && m.status !== "sent") return false;
        if (!m.id.startsWith("temp-") && m.status !== "sent") return false;
        const sameText = (m.bot_message || "") === (serverMsg.bot_message || "");
        const sameMedia = (m.media_filename || "") === (serverMsg.media_filename || "");
        const dt = Math.abs(new Date(m.created_at).getTime() - new Date(serverMsg.created_at).getTime());
        return sameText && sameMedia && dt < 60_000;
      });
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...serverMsg, status: "sent" };
        return clone;
      }
      return [...prev, serverMsg];
    });
  }, []);

  // Realtime
  useEffect(() => {
    if (!phone || !user?.id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      const safePhone = phone.replace(/\D/g, "");
      const channelName = `chat-${safePhone}-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload: any) => {
            const msg = payload.new;
            const cleanPhone = phone.replace(/\D/g, "");
            const msgPhone = (msg.phone || "").replace(/\D/g, "");
            if (msg.whatsapp_instance_name !== "meta_official") return;
            if (!msgPhone.includes(cleanPhone.slice(-8)) && !cleanPhone.includes(msgPhone.slice(-8))) return;
            reconcile(msg);
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_messages" },
          (payload: any) => {
            const msg = payload.new;
            if (msg.whatsapp_instance_name !== "meta_official") return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      delivery_status: msg.delivery_status ?? m.delivery_status,
                      failure_reason: msg.failure_reason ?? m.failure_reason,
                      meta_message_id: msg.meta_message_id ?? m.meta_message_id,
                    }
                  : m
              )
            );
          }
        )
        .subscribe();
    } catch (error) {
      console.error("Erro ao assinar mensagens em tempo real:", error);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [phone, user?.id, reconcile]);

  return { messages, loading, refetch: fetchMessages, addOptimistic, updateOptimistic, removeOptimistic };
};
