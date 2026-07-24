import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, CheckCheck, EyeOff, Reply, Clock, AlertTriangle } from "lucide-react";

interface Msg {
  id: string;
  user_message: string | null;
  bot_message: string | null;
  message_direction: string | null;
  delivery_status?: string | null;
  created_at: string;
  status?: "pending" | "sent" | "failed";
}

interface Props {
  messages: Msg[];
  contactPhone: string;
}

const tz = "America/Sao_Paulo";

const isOutbound = (m: Msg) =>
  m.message_direction === "outbound" || (!!m.bot_message && !m.user_message);
const isInbound = (m: Msg) =>
  m.message_direction === "inbound" || (!!m.user_message && !m.bot_message);

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const dayKey = (d: number) => new Date(d).toLocaleDateString("en-CA", { timeZone: tz });
  const today = dayKey(Date.now());
  const yest = dayKey(Date.now() - 86400000);
  const k = dayKey(then);
  const time = new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
  if (k === yest) return `ontem ${time}`;
  if (k === today) return time;
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: tz }) + " " + time;
};

const ChatStatusSummary: React.FC<Props> = ({ messages, contactPhone }) => {
  const [windowExpiresAt, setWindowExpiresAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const rawDigits = (contactPhone || "").replace(/\D/g, "");
      const withDDI = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
      const candidates = new Set<string>([withDDI]);
      if (withDDI.length === 13 && withDDI[4] === "9") {
        candidates.add(withDDI.slice(0, 4) + withDDI.slice(5));
      }
      if (withDDI.length === 12) {
        candidates.add(withDDI.slice(0, 4) + "9" + withDDI.slice(4));
      }
      const { data } = await (supabase as any)
        .from("whatsapp_conversation_windows")
        .select("phone_e164, expires_at")
        .in("phone_e164", Array.from(candidates));
      if (cancelled) return;
      const win = (data || [])
        .filter((w: any) => w.expires_at)
        .sort((a: any, b: any) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];
      setWindowExpiresAt(win?.expires_at ? new Date(win.expires_at) : null);
    };
    load();
  }, [contactPhone, messages.length]);

  const stats = useMemo(() => {
    const cutoff30 = Date.now() - 30 * 86400000;
    const cutoff7 = Date.now() - 7 * 86400000;

    let delivered = 0;
    let read = 0;
    let hiddenRead = 0;
    let failedRecent = 0;
    let lastInbound: string | null = null;

    // último inbound geral
    for (const m of messages) {
      if (isInbound(m)) {
        if (!lastInbound || new Date(m.created_at) > new Date(lastInbound)) {
          lastInbound = m.created_at;
        }
      }
    }

    for (const m of messages) {
      const t = new Date(m.created_at).getTime();
      if (!isOutbound(m)) continue;
      const ds = m.delivery_status;
      if (t >= cutoff30) {
        if (ds === "delivered" || ds === "read") delivered += 1;
        if (ds === "read") read += 1;
        if (ds === "delivered" && lastInbound && new Date(lastInbound) > new Date(m.created_at)) {
          hiddenRead += 1;
        }
      }
      if (t >= cutoff7 && (ds === "failed" || m.status === "failed")) failedRecent += 1;
    }

    return { delivered, read, hiddenRead, failedRecent, lastInbound };
  }, [messages]);

  const windowOpen = !!windowExpiresAt && windowExpiresAt.getTime() > Date.now();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="px-3 lg:px-4 py-2 border-b border-border bg-card/60 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        {/* Entregues */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{stats.delivered}</span>
              <span className="hidden sm:inline">entregues</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Mensagens outbound entregues nos últimos 30 dias (inclui lidas).
          </TooltipContent>
        </Tooltip>

        {/* Lidas */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-muted-foreground">
              <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
              <span className="font-medium text-foreground">{stats.read}</span>
              <span className="hidden sm:inline">lidas</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Confirmadas como lidas pela Meta (checks azuis).
          </TooltipContent>
        </Tooltip>

        {/* Leitura oculta */}
        {stats.hiddenRead > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{stats.hiddenRead}</span>
                <span className="hidden sm:inline">leitura oculta</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              O lead respondeu depois destas mensagens, então foram lidas — mas a Meta não
              enviou o evento "read". Isso indica que a confirmação de leitura está
              desativada no WhatsApp do contato.
            </TooltipContent>
          </Tooltip>
        )}

        {/* Última resposta */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Reply className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Última resposta:</span>
              <span className="font-medium text-foreground">
                {stats.lastInbound ? formatRelative(stats.lastInbound) : "—"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {stats.lastInbound
              ? new Date(stats.lastInbound).toLocaleString("pt-BR", { timeZone: tz })
              : "Nenhuma resposta recebida do lead."}
          </TooltipContent>
        </Tooltip>

        {/* Janela 24h */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full border ${
                windowOpen
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{windowOpen ? "Janela 24h aberta" : "Fora da janela 24h"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {windowOpen && windowExpiresAt
              ? `Expira em ${windowExpiresAt.toLocaleString("pt-BR", { timeZone: tz })}`
              : "Só é possível enviar templates aprovados até o lead responder."}
          </TooltipContent>
        </Tooltip>

        {/* Falhas recentes */}
        {stats.failedRecent > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-destructive/40 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">{stats.failedRecent}</span>
                <span className="hidden sm:inline">falhas (7d)</span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              Mensagens que a Meta não entregou nos últimos 7 dias. Passe o mouse na
              mensagem para ver o motivo específico (ex.: número inválido, engajamento
              bloqueado, destinatário indisponível).
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ChatStatusSummary;
