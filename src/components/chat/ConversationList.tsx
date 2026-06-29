import React from "react";
import { Conversation } from "@/hooks/useConversations";
import { MessageCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedPhone: string | null;
  onSelect: (phone: string, name: string, assessorName?: string | null) => void;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
};

const getInitials = (name: string) =>
  name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

const ConversationList: React.FC<ConversationListProps> = ({
  conversations, loading, selectedPhone, onSelect,
}) => {
  const [search, setSearch] = useState("");
  const { isAdmin } = useUserRole();

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          Conversas WhatsApp
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <span>{search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}</span>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.phone}
              onClick={() => onSelect(conv.phone, conv.name, conv.assessorName)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${
                selectedPhone === conv.phone ? "bg-muted/70" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                {getInitials(conv.name)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Nome do assessor (só para admin/global) */}
                {isAdmin && conv.assessorName && (
                  <p className="text-[10px] text-emerald-500 font-medium truncate flex items-center gap-1">
                    ↳ {conv.assessorName}
                  </p>
                )}
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm text-foreground truncate">{conv.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(conv.lastTime)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage || "Mídia"}</p>
              </div>
              {/* Indicador inbound */}
              {conv.unread && (
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
