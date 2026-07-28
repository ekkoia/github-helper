import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { normalizePhoneForMatch } from "@/lib/phoneMatch";

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
  whatsapp_instance_name?: string | null;
  meta_message_id?: string | null;
  delivery_status?: string | null;
  failure_reason?: string | null;
  meta_raw_payload?: any | null;
  // Optimistic UI (client-only)
  status?: "pending" | "sent" | "failed";
  __retry?: () => void;
}

const normalizeChatMessage = (message: any): ChatMessage => ({
  ...message,
  id: String(message?.id ?? ""),
});

export const useChatMessages = (phone: string | null) => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<ChatMessage[]>([]);

  // Mantém ref sincronizada para uso no handler realtime
  useEffect(() => {
    pendingRef.current = messages.filter((m) => m.status === "pending" || m.status === "failed");
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    if (!phone || !user?.id) return;
    // Aguarda o papel do usuário estar resolvido antes de consultar,
    // caso contrário o filtro fallback (user_id) pode rodar com isAdmin
    // ainda incerto e sobrescrever o estado com resultado vazio.
    if (roleLoading) return;

    setLoading(true);
    const cleanPhone = phone.replace(/\D/g, "");
    const matchKey = normalizePhoneForMatch(phone);

    let query = (supabase as any)
      .from("chat_messages")
      .select("id, phone, nomewpp, user_message, bot_message, message_type, message_direction, media_type, media_url, media_mime_type, media_filename, meta_account_id, user_id, created_at, meta_message_id, delivery_status, failure_reason, meta_raw_payload")
      .eq("whatsapp_instance_name", "meta_official")
      .like("phone", `%${cleanPhone.slice(-8)}`)
      .order("created_at", { ascending: true });

    if (!isAdmin) {
      const { data: myLeads, error: assignedLeadError } = await (supabase as any)
        .from("leads")
        .select("id, telefone")
        .eq("responsavel_id", user.id);

      if (assignedLeadError) {
        console.error("Erro ao validar responsável da conversa:", assignedLeadError);
        setMessages([]);
        setLoading(false);
        return;
      }

      const assignedLead = (myLeads || []).find(
        (lead: any) => normalizePhoneForMatch(lead.telefone) === matchKey
      );

      if (!assignedLead) {
        setMessages([]);
        setLoading(false);
        return;
      }
    }
    const { data, error } = await query;
    if (error) { console.error("Erro ao buscar mensagens:", error); }
    const serverMsgs = (data || [])
      .filter((m: any) => m.user_message || m.bot_message || m.media_url)
      .map(normalizeChatMessage);
    // Preserva otimistas ainda pendentes (não reconciliadas)
    setMessages((prev) => {
      const stillPending = prev.filter((m) => m.status === "pending" || m.status === "failed");
      const prevServer = prev.filter((m) => m.status !== "pending" && m.status !== "failed");
      // Se o servidor devolveu vazio mas já tínhamos mensagens carregadas,
      // preserva o estado anterior (evita "piscar vazio" em race conditions).
      if (serverMsgs.length === 0 && prevServer.length > 0) {
        return prev;
      }
      return [...serverMsgs, ...stillPending];
    });
    setLoading(false);
  }, [phone, user?.id, isAdmin, roleLoading]);


  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateOptimistic = useCallback((tempId: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (String(m.id) === tempId ? { ...m, ...patch } : m)));
  }, []);

  const removeOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
  }, []);

  // Reconciliação: quando chega INSERT do servidor, tenta casar com pendente
  const reconcile = useCallback((serverMsg: ChatMessage) => {
    const normalizedServerMsg = normalizeChatMessage(serverMsg);
    setMessages((prev) => {
      // Já existe (mesmo id)?
      if (prev.find((m) => String(m.id) === normalizedServerMsg.id)) return prev;
      // Tenta casar com um pendente similar
      const idx = prev.findIndex((m) => {
        if (m.status !== "pending" && m.status !== "sent") return false;
        const messageId = String(m.id ?? "");
        if (!messageId.startsWith("temp-") && m.status !== "sent") return false;
        const sameText = (m.bot_message || "") === (normalizedServerMsg.bot_message || "");
        const sameMedia = (m.media_filename || "") === (normalizedServerMsg.media_filename || "");
        const dt = Math.abs(new Date(m.created_at).getTime() - new Date(normalizedServerMsg.created_at).getTime());
        return sameText && sameMedia && dt < 60_000;
      });
      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...normalizedServerMsg, status: "sent" };
        return clone;
      }
      return [...prev, normalizedServerMsg];
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
            const msg = normalizeChatMessage(payload.new);
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
            const msg = normalizeChatMessage(payload.new);
            if (msg.whatsapp_instance_name !== "meta_official") return;
            setMessages((prev) =>
              prev.map((m) =>
                String(m.id) === msg.id
                  ? {
                      ...m,
                      delivery_status: msg.delivery_status ?? m.delivery_status,
                      failure_reason: msg.failure_reason ?? m.failure_reason,
                      meta_message_id: msg.meta_message_id ?? m.meta_message_id,
                      meta_raw_payload: msg.meta_raw_payload ?? m.meta_raw_payload,
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
