import React, { useEffect, useRef, useState } from "react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useMetaAccount } from "@/hooks/useMetaAccount";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import MessageBubble from "./MessageBubble";
import MetaChatInput from "./MetaChatInput";
import LeadInfoPanel from "./LeadInfoPanel";
import { AlertCircle, MessageCircle, BotOff, Bot, PanelRightOpen, PanelRightClose, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const useIsBelowLg = () => {
  const [v, setV] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const on = () => setV(mql.matches);
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return v;
};

interface ChatWindowProps {
  phone: string;
  name: string;
  assessorName?: string | null;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ phone, name, assessorName, onBack }) => {
  const { messages, loading, refetch, addOptimistic, updateOptimistic, removeOptimistic } = useChatMessages(phone);
  const { account, loading: loadingAccount } = useMetaAccount();
  const { isAdmin } = useUserRole();
  const { usersMap } = useUsers();
  const isMobile = useIsMobile();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [iaStatus, setIaStatus] = useState<string | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [showLeadPanel, setShowLeadPanel] = useState(false);

  // Normaliza no mesmo formato armazenado em dados_cliente (55DDDNUMERO, sem 9 extra)
  const normalizePhoneBR = (raw: string) => {
    let d = (raw || "").replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    if (d.length === 13 && d.startsWith("55") && d[4] === "9") {
      d = d.slice(0, 4) + d.slice(5);
    }
    return d;
  };
  const phoneKey = normalizePhoneBR(phone);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Busca status da IA
  useEffect(() => {
    const fetchIA = async () => {
      const { data } = await (supabase as any)
        .from("dados_cliente")
        .select("atendimento_ia")
        .eq("telefone", phoneKey)
        .maybeSingle();
      setIaStatus(data?.atendimento_ia || null);
    };
    fetchIA();
  }, [phoneKey]);

  const toggleIA = async () => {
    setLoadingIA(true);
    const newStatus = iaStatus === "pause" ? "reativada" : "pause";
    const { error } = await (supabase as any)
      .from("dados_cliente")
      .upsert(
        { telefone: phoneKey, atendimento_ia: newStatus },
        { onConflict: "telefone" }
      );

    if (error) {
      toast.error("Erro ao atualizar status da IA");
    } else {
      setIaStatus(newStatus);
      toast.success(newStatus === "pause" ? "IA pausada" : "IA reativada");
    }
    setLoadingIA(false);
  };

  if (loadingAccount) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertCircle className="h-10 w-10 opacity-40" />
        <div className="text-center">
          <p className="font-medium text-sm">Conta Meta não configurada</p>
          <p className="text-xs mt-1">Configure em Configurações → WhatsApp Meta</p>
        </div>
      </div>
    );
  }

  const isPaused = iaStatus === "pause";

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-3 lg:px-4 py-3 border-b border-border flex items-center gap-2 lg:gap-3 bg-card">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden h-8 w-8 flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {isAdmin && assessorName && (
              <p className="text-[10px] text-emerald-500 font-medium">↳ {assessorName}</p>
            )}
            <p className="font-medium text-sm text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
          {/* Botão Pausar/Reativar IA */}
          <Button
            variant={isPaused ? "outline" : "destructive"}
            size="sm"
            onClick={toggleIA}
            disabled={loadingIA}
            className="gap-1.5 text-xs flex-shrink-0"
          >
            {isPaused ? (
              <><Bot className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reativar IA</span></>
            ) : (
              <><BotOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Pausar IA</span></>
            )}
          </Button>
          {/* Toggle painel do lead */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLeadPanel((v) => !v)}
            className="flex-shrink-0 h-8 w-8"
            title={showLeadPanel ? "Ocultar painel do lead" : "Mostrar painel do lead"}
          >
            {showLeadPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-1 bg-muted/10">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            (() => {
              const tz = "America/Sao_Paulo";
              const dayKey = (d: string) =>
                new Date(d).toLocaleDateString("en-CA", { timeZone: tz });
              const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: tz });
              const yesterdayKey = new Date(Date.now() - 86400000).toLocaleDateString("en-CA", { timeZone: tz });
              const formatLabel = (key: string, iso: string) => {
                if (key === todayKey) return "Hoje";
                if (key === yesterdayKey) return "Ontem";
                const diffDays = Math.floor(
                  (new Date(todayKey).getTime() - new Date(key).getTime()) / 86400000
                );
                if (diffDays > 0 && diffDays < 7) {
                  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", timeZone: tz });
                }
                return new Date(iso).toLocaleDateString("pt-BR", { timeZone: tz });
              };
              let lastKey = "";
              return messages.map((msg) => {
                const key = dayKey(msg.created_at);
                const showSep = key !== lastKey;
                lastKey = key;
                return (
                  <React.Fragment key={msg.id}>
                    {showSep && (
                      <div className="flex justify-center my-3">
                        <span className="px-3 py-1 rounded-full bg-card border border-border text-[11px] text-muted-foreground shadow-sm capitalize">
                          {formatLabel(key, msg.created_at)}
                        </span>
                      </div>
                    )}
                    <MessageBubble message={msg} usersMap={usersMap} isAdmin={isAdmin} />
                  </React.Fragment>
                );
              });
            })()
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 lg:px-4 pb-3 lg:pb-4">
          <MetaChatInput
            contactPhone={phone}
            contactName={name}
            metaAccount={account}
            onMessageSent={refetch}
            addOptimistic={addOptimistic}
            updateOptimistic={updateOptimistic}
            removeOptimistic={removeOptimistic}
          />

        </div>
      </div>

      {/* Painel lateral do lead — overlay em mobile */}
      {showLeadPanel && (
        <>
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setShowLeadPanel(false)}
            />
          )}
          <div
            className={
              isMobile
                ? "fixed right-0 top-0 bottom-0 z-50 bg-background shadow-xl lg:hidden animate-in slide-in-from-right"
                : "hidden lg:block"
            }
          >
            <LeadInfoPanel phone={phone} />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWindow;
