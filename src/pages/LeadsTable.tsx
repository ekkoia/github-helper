import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { DashboardSkeleton, TableSkeleton } from "@/components/SkeletonLoader";
import { LeadForm } from "@/components/LeadForm";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportToCSV } from "@/lib/exportUtils";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { getTopoDaFaixa } from "@/lib/investmentUtils";
import { useUserRole } from "@/hooks/useUserRole";

const ITEMS_PER_PAGE = 20;

const ORIGEM_LABELS: Record<string, string> = {
  instagram_ads: "Instagram Ads",
  facebook_ads: "Facebook Ads",
  whatsapp: "WhatsApp",
  formulario_meta: "Formulário Nativo Meta",
  campanha_mensagem: "Campanha de Mensagem",
  indicacao: "Indicação",
  site: "Site/Landing Page",
  outro: "Outro",
};

const LeadsTable = () => {
  const { logActivity } = useActivityLog();
  const { coresMap } = useFunilEtapas();
  const { isAdmin } = useUserRole();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteLeadName, setDeleteLeadName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("data_criacao");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const [filters, setFilters] = useState({
    etapa: "all",
    protocolo: ""
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("data_criacao", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar leads");
      console.error(error);
      setIsLoading(false);
      return;
    }

    setLeads(data || []);
    setIsLoading(false);
  };

  // Filtragem e ordenação
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = [...leads];

    // Busca global
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.nome_completo?.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.telefone?.includes(term)
      );
    }

    // Filtros laterais
    if (filters.etapa !== "all") {
      filtered = filtered.filter((lead) => lead.etapa_funil === filters.etapa);
    }
    if (filters.protocolo) {
      filtered = filtered.filter((lead) => 
        lead.protocolo_atendimento?.toLowerCase().includes(filters.protocolo.toLowerCase())
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Tratamento especial para campos numéricos e datas
      if (sortBy === "data_criacao") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortBy === "valor_produto") {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === "string") {
        aVal = aVal?.toLowerCase() || "";
        bVal = bVal?.toLowerCase() || "";
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [leads, searchTerm, filters, sortBy, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAndSortedLeads.slice(start, end);
  }, [filteredAndSortedLeads, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const handleDelete = async () => {
    if (!deleteLeadId) return;

    const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);

    if (error) {
      toast.error("Erro ao excluir lead");
      return;
    }

    // Registrar atividade de exclusão
    await logActivity(
      'lead_deleted',
      `Excluiu o lead "${deleteLeadName}"`,
      { lead_id: deleteLeadId, lead_nome: deleteLeadName }
    );

    toast.success("Lead excluído com sucesso!");
    setDeleteLeadId(null);
    setDeleteLeadName("");
    fetchLeads();
  };

  const handleEdit = (lead: any) => {
    setEditingLead(lead);
    setIsDetailsOpen(false);
    setIsFormOpen(true);
  };

  const handleRowClick = async (lead: any) => {
    setSelectedLead(lead);
    setIsDetailsOpen(true);
    
    // Registrar visualização do lead
    await logActivity(
      'lead_viewed',
      `Visualizou detalhes do lead "${lead.nome_completo}"`,
      { lead_id: lead.id, lead_nome: lead.nome_completo }
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      etapa: "all",
      protocolo: ""
    });
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // KPIs calculation
  const kpis = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const leadsGanhosMes = leads.filter(
      (lead) => 
        lead.etapa_funil === "Ganho" && 
        new Date(lead.data_criacao) >= firstDayOfMonth
    ).length;

    const valorTotal = leads.reduce((acc, lead) => {
      const valor = parseFloat(lead.valor_produto) || 0;
      return acc + getTopoDaFaixa(valor);
    }, 0);

    const taxaConversao = leads.length > 0 
      ? (leads.filter(lead => lead.etapa_funil === "Ganho").length / leads.length) * 100
      : 0;

    return {
      totalLeads: leads.length,
      leadsGanhos: leadsGanhosMes,
      taxaConversao,
      volumeTotal: valorTotal,
    };
  }, [leads]);

  const handleExport = async () => {
    exportToCSV(filteredAndSortedLeads, `leads_${new Date().toISOString().split('T')[0]}.csv`);
    
    // Registrar exportação
    await logActivity(
      'lead_exported',
      `Exportou ${filteredAndSortedLeads.length} leads para CSV`,
      { quantidade: filteredAndSortedLeads.length, filtros: filters }
    );
    
    toast.success("Arquivo CSV exportado com sucesso!");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DashboardSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Dashboard KPIs */}
        <Dashboard 
          totalLeads={kpis.totalLeads}
          leadsGanhos={kpis.leadsGanhos}
          taxaConversao={kpis.taxaConversao}
          volumeTotal={kpis.volumeTotal}
        />

        {/* Busca Global */}
        <GlobalSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, email ou telefone..." />

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads - Tabela</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? "s" : ""} 
              {isAdmin ? " no total" : " atribuído(s) a você"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              className="gap-2"
              disabled={filteredAndSortedLeads.length === 0}
              aria-label="Exportar leads para CSV"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <Button
              onClick={() => {
                setEditingLead(null);
                setIsFormOpen(true);
              }}
              className="shadow-elevation-2 gap-2"
              aria-label="Criar novo lead"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Novo Lead</span>
            </Button>
          </div>
        </div>

        {/* Layout com filtros e tabela */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filtros laterais */}
          <FiltersSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            totalLeads={leads.length}
            filteredLeads={filteredAndSortedLeads.length}
          />

          {/* Tabela */}
          <div className="flex-1 space-y-4">
            <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => toggleSort("nome_completo")}
                      >
                        <div className="flex items-center gap-2">
                          Nome
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Qtd Cotas</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => toggleSort("valor_produto")}
                      >
                        <div className="flex items-center gap-2">
                          Valor Investido
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum lead encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLeads.map((lead) => (
                        <TableRow 
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(lead)}
                        >
                          <TableCell className="font-medium">{lead.nome_completo}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{lead.telefone || "-"}</div>
                              <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                                {lead.email || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{lead.volume || "-"}</TableCell>
                          <TableCell>
                            {lead.valor_produto 
                              ? new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(getTopoDaFaixa(parseFloat(lead.valor_produto)))
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {ORIGEM_LABELS[lead.origem] || lead.origem || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${coresMap[lead.etapa_funil] || "bg-gray-500"} text-white text-xs whitespace-nowrap px-2 py-0.5`}>
                              {lead.etapa_funil || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(lead);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteLeadId(lead.id);
                                  setDeleteLeadName(lead.nome_completo);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dialog do Formulário */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLead ? "Editar Lead" : "Novo Lead"}
              </DialogTitle>
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

        {/* Modal de Detalhes */}
        <LeadDetailsModal
          lead={selectedLead}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedLead(null);
          }}
          onEdit={() => handleEdit(selectedLead)}
          onLeadUpdated={fetchLeads}
        />

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  export default LeadsTable;
