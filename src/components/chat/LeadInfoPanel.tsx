import React, { useState } from "react";
import { useLeadByPhone } from "@/hooks/useLeadByPhone";
import { useUsers } from "@/hooks/useUsers";
import { User, Mail, Phone, Tag, UserCheck, StickyNote, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LeadInfoPanelProps {
  phone: string;
}

const LeadInfoPanel: React.FC<LeadInfoPanelProps> = ({ phone }) => {
  const { lead, etapas, loading, updateLead, updateEtapa } = useLeadByPhone(phone);
  const { users, usersMap } = useUsers();
  const [noteValue, setNoteValue] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  React.useEffect(() => {
    setNoteValue(lead?.nota_assessor || "");
  }, [lead?.id]);

  if (loading) {
    return (
      <div className="w-72 border-l border-border flex items-center justify-center flex-shrink-0">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="w-72 border-l border-border flex flex-col items-center justify-center gap-2 p-6 text-center flex-shrink-0">
        <User className="h-8 w-8 text-muted-foreground opacity-30" />
        <p className="text-xs text-muted-foreground">
          Nenhum lead cadastrado vinculado a este número
        </p>
      </div>
    );
  }

  const currentEtapa = etapas.find((e) => e.nome === lead.etapa_funil);
  const responsavel = lead.responsavel_id ? usersMap[lead.responsavel_id] : null;

  const handleEtapaChange = async (etapaNome: string) => {
    const ok = await updateEtapa(etapaNome);
    if (ok) toast.success("Etapa atualizada");
    else toast.error("Erro ao atualizar etapa");
  };

  const handleAtribuirChange = async (userId: string) => {
    const ok = await updateLead({ responsavel_id: userId || null });
    if (ok) toast.success(userId ? "Lead atribuído" : "Atribuição removida");
    else toast.error("Erro ao atribuir lead");
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    const ok = await updateLead({ nota_assessor: noteValue });
    setSavingNote(false);
    if (ok) toast.success("Nota salva");
    else toast.error("Erro ao salvar nota");
  };

  return (
    <div className="w-72 border-l border-border flex flex-col flex-shrink-0 bg-card overflow-y-auto">
      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-2 p-5 border-b border-border">
        <div className="w-14 h-14 rounded-full bg-emerald-700 flex items-center justify-center text-white font-semibold text-lg">
          {(lead.nome_completo || phone).split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
        </div>
        <p className="font-medium text-sm text-foreground text-center">{lead.nome_completo || "Sem nome"}</p>
      </div>

      {/* Dados de contato */}
      <div className="p-4 border-b border-border space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{lead.telefone || phone}</span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.origem && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{lead.origem}</span>
          </div>
        )}
      </div>

      {/* Etapa do funil */}
      <div className="p-4 border-b border-border space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Etapa do funil</p>
        <div className="relative">
          <div
            className="flex items-center gap-2 mb-1.5"
          >
            {currentEtapa && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentEtapa.cor }}
              />
            )}
            <span className="text-sm text-foreground truncate">
              {lead.etapa_funil || "Sem etapa"}
            </span>
          </div>
          <select
            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
            value={lead.etapa_funil || ""}
            onChange={(e) => handleEtapaChange(e.target.value)}
          >
            <option value="">Selecionar etapa...</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.nome}>{e.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Atribuído a */}
      <div className="p-4 border-b border-border space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" /> Atribuído a
        </p>
        <select
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
          value={lead.responsavel_id || ""}
          onChange={(e) => handleAtribuirChange(e.target.value)}
        >
          <option value="">Ninguém atribuído</option>
          {users.map((u) => (
            <option key={u.user_id} value={u.user_id}>{u.nome_completo || u.email}</option>
          ))}
        </select>
        {responsavel && (
          <p className="text-[10px] text-emerald-500">↳ {responsavel.nome_completo}</p>
        )}
      </div>

      {/* Nota do assessor */}
      <div className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5" /> Nota do assessor
        </p>
        <textarea
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-2 text-foreground resize-none min-h-[80px]"
          placeholder="Adicionar observações sobre este lead..."
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onFocus={() => setNoteOpen(true)}
        />
        {(noteOpen || noteValue !== (lead.nota_assessor || "")) && (
          <button
            onClick={handleSaveNote}
            disabled={savingNote || noteValue === (lead.nota_assessor || "")}
            className="w-full text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-md py-1.5 transition-colors"
          >
            {savingNote ? "Salvando..." : "Salvar nota"}
          </button>
        )}
      </div>
    </div>
  );
};

export default LeadInfoPanel;
