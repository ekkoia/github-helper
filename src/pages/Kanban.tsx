import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { KanbanSkeleton } from "@/components/SkeletonLoader";
import { LeadForm } from "@/components/LeadForm";
import { GlobalSearch } from "@/components/GlobalSearch";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { getWhatsAppUrl } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Mail, Phone, User, Package, DollarSign, MoreVertical, Eye, Edit, AlertCircle, MessageCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { useUserRole } from "@/hooks/useUserRole";
import { useUsers } from "@/hooks/useUsers";

const Kanban = () => {
  const { logActivity } = useActivityLog();
  const { etapasNomes, coresMap, isLoading: isLoadingEtapas } = useFunilEtapas();
  const { isAdmin } = useUserRole();
  const { usersMap } = useUsers();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draggedLead, setDraggedLead] = useState<any>(null);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const scrollDirRef = useRef<-1 | 0 | 1>(0);

  const stopAutoScroll = useCallback(() => {
    scrollDirRef.current = 0;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const ensureAutoScrollLoop = useCallback(() => {
    if (rafRef.current) return;

    const loop = () => {
      const container = scrollContainerRef.current;
      if (!container) {
        rafRef.current = null;
        return;
      }

      if (scrollDirRef.current !== 0) {
        container.scrollLeft += scrollDirRef.current * 12;
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const handleDragOverWithScroll = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const container = scrollContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX;
      const scrollZone = 100; // px da borda para iniciar scroll

      const isLeft = mouseX < containerRect.left + scrollZone;
      const isRight = mouseX > containerRect.right - scrollZone;

      const nextDir: -1 | 0 | 1 = isLeft ? -1 : isRight ? 1 : 0;

      if (nextDir === 0) {
        stopAutoScroll();
        return;
      }

      scrollDirRef.current = nextDir;
      ensureAutoScrollLoop();
    },
    [ensureAutoScrollLoop, stopAutoScroll],
  );

  const handleDragEnd = useCallback(() => {
    stopAutoScroll();
    setDraggedLead(null);
  }, [stopAutoScroll]);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    const handler = () => fetchLeads();
    window.addEventListener("funil-reordenado", handler);
    return () => window.removeEventListener("funil-reordenado", handler);
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllLeads();
      setLeads(data);
    } catch (error) {
      toast.error("Erro ao carregar leads");
      console.error(error);
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;

    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";

    return () => {
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflowX = prevBodyOverflowX;
    };
  }, []);

  // Filtrar leads por busca global e responsável
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.nome_completo?.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.telefone?.includes(term) ||
          lead.cidade?.toLowerCase().includes(term),
      );
    }

    if (filterResponsavel !== "all") {
      if (filterResponsavel === "unassigned") {
        result = result.filter((lead) => !lead.responsavel_id);
      } else {
        result = result.filter((lead) => lead.responsavel_id === filterResponsavel);
      }
    }

    return result;
  }, [leads, searchTerm, filterResponsavel]);

  const getLeadsByEtapa = (etapa: string) => {
    return filteredLeads.filter((lead) => lead.etapa_funil === etapa);
  };

  const handleDragStart = (lead: any) => {
    setDraggedLead(lead);
  };

  const handleDrop = async (etapa: string) => {
    if (!draggedLead || draggedLead.etapa_funil === etapa) {
      setDraggedLead(null);
      return;
    }

    const etapaAnterior = draggedLead.etapa_funil;

    const { error } = await supabase.from("leads").update({ etapa_funil: etapa }).eq("id", draggedLead.id);

    if (error) {
      toast.error("Erro ao mover lead");
      return;
    }

    // Registrar atividade de mudança de etapa
    await logActivity(
      "lead_stage_changed",
      `Moveu "${draggedLead.nome_completo}" de "${etapaAnterior}" para "${etapa}"`,
      {
        lead_id: draggedLead.id,
        lead_nome: draggedLead.nome_completo,
        etapa_anterior: etapaAnterior,
        etapa_nova: etapa,
      },
    );

    // Registrar se foi ganho ou perdido
    if (etapa === "Ganho") {
      await logActivity("lead_won", `Marcou o lead "${draggedLead.nome_completo}" como Ganho`, {
        lead_id: draggedLead.id,
        lead_nome: draggedLead.nome_completo,
        etapa_anterior: etapaAnterior,
      });
    } else if (etapa === "Perdido") {
      await logActivity("lead_lost", `Marcou o lead "${draggedLead.nome_completo}" como Perdido`, {
        lead_id: draggedLead.id,
        lead_nome: draggedLead.nome_completo,
        etapa_anterior: etapaAnterior,
      });
    }

    toast.success(`Lead movido para ${etapa}`);
    fetchLeads();
    setDraggedLead(null);
  };

  const handleCardClick = (lead: any) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (lead: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLead(lead);
    setIsDetailsOpen(true);
  };

  const handleEditFromMenu = (lead: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  if (isLoading || isLoadingEtapas) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Busca Global + Filtro Assessor */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <GlobalSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, email, telefone ou cidade..."
          />
        </div>
        {isAdmin && (
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar por assessor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Todos os assessores
                </span>
              </SelectItem>
              <SelectItem value="unassigned">
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Não atribuídos
                </span>
              </SelectItem>
              {Object.values(usersMap).map((user) => (
                <SelectItem key={user.user_id} value={user.user_id}>
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {user.nome_completo || user.email || "Usuário"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Header com Botão */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads - Kanban</h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
            {isAdmin ? " encontrado(s)" : " atribuído(s) a você"}
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingLead(null);
            setIsFormOpen(true);
          }}
          className="shadow-elevation-2 gap-2 shrink-0"
          aria-label="Criar novo lead"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Novo Lead</span>
        </Button>
      </div>

      {/* Kanban Board */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
        onDragOver={handleDragOverWithScroll}
        onDrop={stopAutoScroll}
      >
        <div className="flex gap-4 items-start">
          {etapasNomes.map((etapa) => {
            const leadsNaEtapa = getLeadsByEtapa(etapa);
            return (
              <div
                key={etapa}
                className="w-[78vw] md:w-auto md:min-w-[320px] flex-shrink-0 snap-start"
                role="region"
                aria-label={`Coluna ${etapa}`}
              >
                <Card className="flex flex-col h-[calc(100vh-280px)] overflow-hidden">
                  <CardHeader
                    className="text-white rounded-t-xl"
                    style={{ backgroundColor: coresMap[etapa] || "#6b7280" }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(etapa)}
                  >
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                      <span>{etapa}</span>
                      <Badge variant="secondary" className="bg-white/20 text-white font-medium">
                        {leadsNaEtapa.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <ScrollArea
                    className="flex-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(etapa)}
                  >
                    <div className="space-y-3 px-5 py-3 min-h-[100px]">
                      {leadsNaEtapa.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead nesta etapa</p>
                      ) : (
                        leadsNaEtapa.map((lead) => (
                          <Card
                            key={lead.id}
                            draggable
                            onDragStart={() => handleDragStart(lead)}
                            onDragEnd={handleDragEnd}
                            className="cursor-move hover:shadow-elevation-3 transition-all duration-300 hover:scale-[1.02] touch-manipulation active:scale-95"
                            role="article"
                            tabIndex={0}
                            aria-label={`Lead ${lead.nome_completo}`}
                          >
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-foreground text-sm flex-1">{lead.nome_completo}</h4>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Ações</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="z-50">
                                    <DropdownMenuItem onClick={(e) => handleOpenDetails(lead, e)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => handleEditFromMenu(lead, e)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="space-y-1.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Investidor</span>
                                </div>
                                {(lead.cidade || lead.uf) && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>
                                      {lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : lead.cidade || lead.uf}
                                    </span>
                                  </div>
                                )}
                                {lead.telefone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>{lead.telefone}</span>
                                    <a
                                      href={getWhatsAppUrl(lead.telefone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-green-500 hover:text-green-600 transition-colors"
                                      title="Abrir WhatsApp"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                )}
                                {lead.tipo_grao && (
                                  <div className="flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" aria-hidden="true" />
                                    <div>
                                      <span className="block">
                                        {lead.tipo_grao} - {lead.volume || "Volume não informado"}
                                      </span>
                                      {lead.valor_produto && (
                                        <span className="text-xs flex items-center gap-1 mt-0.5">
                                          <DollarSign className="h-3 w-3" aria-hidden="true" />
                                          {new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL",
                                          }).format(lead.valor_produto)}
                                          /sc
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {lead.intencao && (
                                <Badge variant="outline" className="text-xs mt-2">
                                  {lead.intencao}
                                </Badge>
                              )}

                              {/* Responsável - apenas para admins */}
                              {isAdmin && (
                                <>
                                  <Separator className="my-2" />
                                  {lead.responsavel_id ? (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">
                                        {usersMap[lead.responsavel_id]?.nome_completo || "Usuário"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded px-1.5 py-1">
                                      <AlertCircle className="h-3 w-3" />
                                      <span>Não atribuído</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog do Formulário */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSuccess={() => {
              setIsFormOpen(false);
              setEditingLead(null);
              fetchLeads();
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingLead(null);
            }}
            initialData={editingLead}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Lead */}
      <LeadDetailsModal
        lead={selectedLead}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedLead(null);
        }}
        onEdit={() => {
          setIsDetailsOpen(false);
          handleCardClick(selectedLead);
        }}
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
};

export default Kanban;
