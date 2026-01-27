import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { DashboardSkeleton, TableSkeleton } from "@/components/SkeletonLoader";
import { LeadForm } from "@/components/LeadForm";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ColumnCustomizer, ColumnVisibility } from "@/components/ColumnCustomizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportToCSV } from "@/lib/exportUtils";
import { useActivityLog } from "@/hooks/useActivityLog";
import { parseVolume } from "@/lib/volumeParser";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";

const ITEMS_PER_PAGE = 20;

const LeadsTable = () => {
  const { logActivity } = useActivityLog();
  const { coresMap } = useFunilEtapas();
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
    perfil: "all",
    cidade: "all",
    uf: "all",
    etapa: "all",
    tipo_grao: "all",
    intencao: "all",
    protocolo: ""
  });

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    localizacao_embarque: false,
    distancia_km: false,
    sentido: false,
    estrada_terra_km: false,
    armazenamento: false,
    qualidade: false,
    tem_royalties: false,
    percentual_royalties: false,
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

  // Extrai cidades únicas para o filtro
  const cidades = useMemo(() => {
    const cidadesSet = new Set(
      leads.filter(lead => lead.cidade).map(lead => lead.cidade)
    );
    return Array.from(cidadesSet).sort();
  }, [leads]);

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
          lead.telefone?.includes(term) ||
          lead.cidade?.toLowerCase().includes(term)
      );
    }

    // Filtros laterais
    if (filters.perfil !== "all") {
      filtered = filtered.filter((lead) => lead.perfil === filters.perfil);
    }
    if (filters.etapa !== "all") {
      filtered = filtered.filter((lead) => lead.etapa_funil === filters.etapa);
    }
    if (filters.tipo_grao !== "all") {
      filtered = filtered.filter((lead) => lead.tipo_grao === filters.tipo_grao);
    }
    if (filters.intencao !== "all") {
      filtered = filtered.filter((lead) => lead.intencao === filters.intencao);
    }
    if (filters.uf !== "all") {
      filtered = filtered.filter((lead) => lead.uf === filters.uf);
    }
    if (filters.cidade !== "all") {
      filtered = filtered.filter((lead) => lead.cidade === filters.cidade);
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
      } else if (sortBy === "valor_produto" || sortBy === "volume") {
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
      perfil: "all",
      cidade: "all",
      uf: "all",
      etapa: "all",
      tipo_grao: "all",
      intencao: "all",
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

    const volumeTotal = leads.reduce((acc, lead) => {
      return acc + parseVolume(lead.volume);
    }, 0);

    const taxaConversao = leads.length > 0 
      ? (leads.filter(lead => lead.etapa_funil === "Ganho").length / leads.length) * 100
      : 0;

    return {
      totalLeads: leads.length,
      leadsGanhos: leadsGanhosMes,
      taxaConversao,
      volumeTotal,
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
        <GlobalSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, email, telefone ou cidade..." />

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leads - Tabela</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedLeads.length} lead{filteredAndSortedLeads.length !== 1 ? "s" : ""} encontrado{filteredAndSortedLeads.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <ColumnCustomizer 
              visibility={columnVisibility}
              onChange={setColumnVisibility}
            />
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
            cidades={cidades}
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
                      <TableHead>Perfil</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Intenção</TableHead>
                      <TableHead>Grão</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => toggleSort("volume")}
                      >
                        <div className="flex items-center gap-2">
                          Volume
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => toggleSort("valor_produto")}
                      >
                        <div className="flex items-center gap-2">
                          Valor
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Etapa</TableHead>
                      {columnVisibility.localizacao_embarque && <TableHead>Loc. Embarque</TableHead>}
                      {columnVisibility.distancia_km && <TableHead>Distância (km)</TableHead>}
                      {columnVisibility.sentido && <TableHead>Sentido</TableHead>}
                      {columnVisibility.estrada_terra_km && <TableHead>Estrada Terra (km)</TableHead>}
                      {columnVisibility.armazenamento && <TableHead>Armazenamento</TableHead>}
                      {columnVisibility.qualidade && <TableHead>Qualidade</TableHead>}
                      {columnVisibility.tem_royalties && <TableHead>Tem Royalties</TableHead>}
                      {columnVisibility.percentual_royalties && <TableHead>% Royalties</TableHead>}
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10 + Object.values(columnVisibility).filter(Boolean).length} className="text-center py-8 text-muted-foreground">
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
                            <Badge variant="outline">{lead.perfil}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{lead.telefone}</div>
                              <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                                {lead.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.cidade && lead.uf ? `${lead.cidade}/${lead.uf}` : lead.cidade || lead.uf || "-"}
                          </TableCell>
                          <TableCell>{lead.intencao || "-"}</TableCell>
                          <TableCell>{lead.tipo_grao || "-"}</TableCell>
                          <TableCell>{lead.volume || "-"}</TableCell>
                          <TableCell>
                            {lead.valor_produto 
                              ? new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(lead.valor_produto)
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge className={`${coresMap[lead.etapa_funil] || "bg-gray-500"} text-white text-xs whitespace-nowrap px-2 py-0.5`}>
                              {lead.etapa_funil}
                            </Badge>
                          </TableCell>
                          {columnVisibility.localizacao_embarque && (
                            <TableCell>{lead.localizacao_embarque || "-"}</TableCell>
                          )}
                          {columnVisibility.distancia_km && (
                            <TableCell>{lead.distancia_km || "-"}</TableCell>
                          )}
                          {columnVisibility.sentido && (
                            <TableCell>{lead.sentido || "-"}</TableCell>
                          )}
                          {columnVisibility.estrada_terra_km && (
                            <TableCell>{lead.estrada_terra_km || "-"}</TableCell>
                          )}
                          {columnVisibility.armazenamento && (
                            <TableCell>{lead.armazenamento || "-"}</TableCell>
                          )}
                          {columnVisibility.qualidade && (
                            <TableCell>{lead.qualidade || "-"}</TableCell>
                          )}
                          {columnVisibility.tem_royalties && (
                            <TableCell>{lead.tem_royalties || "-"}</TableCell>
                          )}
                          {columnVisibility.percentual_royalties && (
                            <TableCell>
                              {lead.percentual_royalties 
                                ? `${lead.percentual_royalties}%`
                                : "-"
                              }
                            </TableCell>
                          )}
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
