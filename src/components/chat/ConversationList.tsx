import React from "react";
import { Conversation } from "@/hooks/useConversations";
import { MessageCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { detectMediaKind, MediaPreviewInline } from "./mediaPreview";
import { useAllLeadTagAssignments, useLeadTagsCatalog, LeadTag } from "@/hooks/useLeadTags";
import { useUsers } from "@/hooks/useUsers";
import { useConversationFilters } from "@/hooks/useConversationFilters";
import ConversationFiltersDialog from "./ConversationFiltersDialog";

// Escolhe cor de texto de acordo com o contraste com o fundo
const getContrastText = (hex: string): string => {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return "#fff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#000" : "#fff";
};


interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedPhone: string | null;
  onSelect: (phone: string, name: string, assessorName?: string | null, windowOpen?: boolean) => void;
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isAdmin } = useUserRole();
  const { map: tagAssignmentsMap } = useAllLeadTagAssignments();
  const { tags: tagCatalog } = useLeadTagsCatalog();
  const { users } = useUsers();
  const { filters, setFilters, clear, activeCount } = useConversationFilters();
  const tagById = React.useMemo(() => {
    const m = new Map<string, LeadTag>();
    tagCatalog.forEach((t) => m.set(t.id, t));
    return m;
  }, [tagCatalog]);
  const userNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.user_id, u.nome_completo || u.email || ""));
    return m;
  }, [users]);


  const filtered = conversations.filter((c) => {
    // Busca
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.phone.includes(search)) return false;
    }
    // Tags
    if (filters.tagIds.length > 0) {
      const leadTags = c.leadId ? tagAssignmentsMap[c.leadId] || [] : [];
      if (!filters.tagIds.some((id) => leadTags.includes(id))) return false;
    }
    // Assessores
    if (filters.assessorIds.length > 0) {
      if (!c.assessorId || !filters.assessorIds.includes(c.assessorId)) return false;
    }
    // Não iniciadas pelo assessor
    if (filters.onlyNotStartedByAssessor) {
      if (!c.assessorId || c.hasAssessorMessage) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          Conversas WhatsApp
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 relative shrink-0"
            onClick={() => setFiltersOpen(true)}
            title="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        {/* Chips de filtros ativos */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.tagIds.map((id) => {
              const t = tagById.get(id);
              if (!t) return null;
              return (
                <button
                  key={`ft-${id}`}
                  onClick={() =>
                    setFilters({ ...filters, tagIds: filters.tagIds.filter((x) => x !== id) })
                  }
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: t.cor, color: "#fff" }}
                >
                  {t.emoji}{t.nome} <X className="h-2.5 w-2.5" />
                </button>
              );
            })}
            {filters.assessorIds.map((id) => (
              <button
                key={`fa-${id}`}
                onClick={() =>
                  setFilters({
                    ...filters,
                    assessorIds: filters.assessorIds.filter((x) => x !== id),
                  })
                }
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-foreground"
              >
                {userNameById.get(id) || "Assessor"} <X className="h-2.5 w-2.5" />
              </button>
            ))}
            {filters.onlyNotStartedByAssessor && (
              <button
                onClick={() => setFilters({ ...filters, onlyNotStartedByAssessor: false })}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-foreground"
              >
                Não iniciadas <X className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              onClick={clear}
              className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      <ConversationFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filters}
        onApply={setFilters}
      />

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
              onClick={() => onSelect(conv.phone, conv.name, conv.assessorName, conv.windowOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${
                selectedPhone === conv.phone ? "bg-muted/70" : ""
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
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
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {(() => {
                    const kind = detectMediaKind(conv.lastMessage, conv.lastMediaType);
                    if (kind) {
                      return <MediaPreviewInline kind={kind} filename={conv.lastMediaFilename} />;
                    }
                    return conv.lastMessage || "Mídia";
                  })()}
                </div>
                {/* Tags do lead */}
                {conv.leadId && tagAssignmentsMap[conv.leadId]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tagAssignmentsMap[conv.leadId].slice(0, 3).map((tagId) => {
                      const t = tagById.get(tagId);
                      if (!t) return null;
                      return (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded font-medium max-w-full truncate"
                          style={{ backgroundColor: t.cor, color: getContrastText(t.cor) }}
                          title={t.nome}
                        >
                          {t.emoji && <span>{t.emoji}</span>}
                          <span className="truncate">{t.nome}</span>
                        </span>
                      );
                    })}
                    {tagAssignmentsMap[conv.leadId].length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{tagAssignmentsMap[conv.leadId].length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Janela de 24h aberta */}
              {conv.windowOpen && (
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Janela de 24h aberta" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
