import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { DashboardSkeleton, TableSkeleton } from "@/components/SkeletonLoader";
import { LeadForm } from "@/components/LeadForm";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Download,
  AlertCircle,
  User,
  Layers,
  CalendarIcon,
  CheckSquare,
  X,
  UserPlus,
  ArrowRightLeft,
  MessageCircle,
} from "lucide-react";
import { subDays, startOfDay, endOfDay, isWithinInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { Upload } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { cn, getWhatsAppUrl } from "@/lib/utils";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { getTopoDaFaixa, getPisoDaFaixa } from "@/lib/investmentUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { useUsers } from "@/hooks/useUsers";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ITEMS_PER_PAGE = 20;

const ORIGEM_LABELS: Record<string, string> = {
  meta_form: "Formulário Nativo Meta",
  formulario_meta: "Formulário Nativo Meta",
  "Form Arvora Nativo": "Form Arvora Nativo",
  whatsapp: "WhatsApp",
  landing_page: "Site/Landing Page",
  site: "Site/Landing Page",
  outro: "Outro",
};

const LeadsTable = () => {
  const { logActivity } = useActivityLog();
  const { etapasNomes, coresMap } = useFunilEtapas();
  const { isAdmin } = useUserRole();
  const { usersMap, users } = useUsers();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [deleteLeadName, setDeleteLeadName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("data_criacao");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exportPeriod, setExportPeriod] = useState("all");
  const [exportDateFrom, setExportDateFrom] = useState<Date>();
  const [exportDateTo, setExportDateTo] = useState<Date>();
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");

  // Bulk selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkStageOpen, setIsBulkStageOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  const [filters, setFilters] = useState<{
    etapa: string;
    protocolo: string;
    responsavel: string;
    origem: string;
    campanha: string;
    periodo: string;
    dataInicio?: Date;
    dataFim?: Date;
  }>({
    etapa: "all",
    protocolo: "",
    responsavel: "all",
    origem: "all",
    campanha: "all",
    periodo: "all",
    dataInicio: undefined,
    dataFim: undefined,
  });

  // Mapa de meta_lead_id -> adset_name para filtro por campanha
  const [campaignMap, setCampaignMap] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchLeads();
    fetchCampaignMap();
  }, []);

  // Realtime: atualiza a tabela quando qualquer lead mudar no banco
  useRealtimeTable(() => fetchLeads(), { table: "leads", channelKey: "leads-table" });

  const fetchCampaignMap = async () => {
    const { data, error } = await supabase.from("leadsNativo_feeagro").select("id, adset_name");

    if (!error && data) {
      const map: Record<number, string> = {};
      data.forEach((row) => {
        if (row.adset_name) map[row.id] = row.adset_name;
      });
      setCampaignMap(map);
    }
  };

  // Função para obter a data do lead no horário Brasil (mesma lógica do Dashboard)
  const getLeadDate = useCallback((lead: any): Date => {
    if (lead.created_time_brasil) {
      const dateStr = lead.created_time_brasil.substring(0, 10);
      return new Date(dateStr + "T12:00:00");
    }
    const date = new Date(lead.data_criacao);
    date.setHours(date.getHours() - 3);
    return date;
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
          lead.nota_assessor?.toLowerCase().includes(term) ||
          lead.observacoes?.toLowerCase().includes(term),
      );
    }

    // Filtros laterais
    if (filters.etapa !== "all") {
      filtered = filtered.filter((lead) => lead.etapa_funil === filters.etapa);
    }
    if (filters.protocolo) {
      filtered = filtered.filter((lead) =>
        lead.protocolo_atendimento?.toLowerCase().includes(filters.protocolo.toLowerCase()),
      );
    }
    // Filtro por responsável (apenas para admins)
    if (isAdmin && filters.responsavel !== "all") {
      if (filters.responsavel === "unassigned") {
        filtered = filtered.filter((lead) => !lead.responsavel_id);
      } else {
        filtered = filtered.filter((lead) => lead.responsavel_id === filters.responsavel);
      }
    }

    // Filtro por origem
    if (filters.origem && filters.origem !== "all") {
      filtered = filtered.filter((lead) => lead.origem === filters.origem);
    }

    // Filtro por campanha (via mapa leadsNativo_feeagro)
    if (filters.campanha && filters.campanha !== "all") {
      filtered = filtered.filter((lead) => {
        if (!lead.meta_lead_id) return false;
        return campaignMap[lead.meta_lead_id] === filters.campanha;
      });
    }

    // Filtro por período/data
    if (filters.periodo && filters.periodo !== "all") {
      const now = new Date();

      if (filters.periodo === "custom" && filters.dataInicio && filters.dataFim) {
        filtered = filtered.filter((lead) => {
          const leadDate = getLeadDate(lead);
          return isWithinInterval(leadDate, {
            start: startOfDay(filters.dataInicio!),
            end: endOfDay(filters.dataFim!),
          });
        });
      } else if (filters.periodo === "hoje") {
        filtered = filtered.filter((lead) => {
          const leadDate = getLeadDate(lead);
          return leadDate.toDateString() === now.toDateString();
        });
      } else if (filters.periodo === "ontem") {
        const yesterday = subDays(now, 1);
        filtered = filtered.filter((lead) => {
          const leadDate = getLeadDate(lead);
          return leadDate.toDateString() === yesterday.toDateString();
        });
      } else {
        const days = parseInt(filters.periodo);
        if (!isNaN(days)) {
          const startDate = subDays(now, days);
          filtered = filtered.filter((lead) => {
            const leadDate = getLeadDate(lead);
            return leadDate >= startDate;
          });
        }
      }
    }
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
  }, [leads, searchTerm, filters, sortBy, sortOrder, isAdmin, campaignMap, getLeadDate]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAndSortedLeads.slice(start, end);
  }, [filteredAndSortedLeads, currentPage]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
    clearSelection();
  }, [searchTerm, filters]);

  // Scroll to top when page changes
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  const handleDelete = async () => {
    if (!deleteLeadId) return;

    const { error } = await supabase.from("leads").delete().eq("id", deleteLeadId);

    if (error) {
      toast.error("Erro ao excluir lead");
      return;
    }

    // Registrar atividade de exclusão
    await logActivity("lead_deleted", `Excluiu o lead "${deleteLeadName}"`, {
      lead_id: deleteLeadId,
      lead_nome: deleteLeadName,
    });

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
    await logActivity("lead_viewed", `Visualizou detalhes do lead "${lead.nome_completo}"`, {
      lead_id: lead.id,
      lead_nome: lead.nome_completo,
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      etapa: "all",
      protocolo: "",
      responsavel: "all",
      origem: "all",
      campanha: "all",
      periodo: "all",
      dataInicio: undefined,
      dataFim: undefined,
    });
  };

  const handleDateChange = (key: string, value: Date | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Bulk selection helpers
  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === paginatedLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(paginatedLeads.map((l) => l.id)));
    }
  };

  const clearSelection = () => setSelectedLeadIds(new Set());

  // Bulk action handlers
  const handleBulkStageChange = async (etapa: string) => {
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from("leads").update({ etapa_funil: etapa }).in("id", ids);
    if (error) {
      toast.error("Erro ao alterar etapa em massa");
      return;
    }
    await logActivity("bulk_stage_change", `Alterou etapa de ${ids.length} leads para "${etapa}"`, {
      lead_ids: ids,
      nova_etapa: etapa,
    });
    toast.success(`${ids.length} leads movidos para "${etapa}"`);
    clearSelection();
    setIsBulkStageOpen(false);
    fetchLeads();
  };

  const handleBulkAssign = async (userId: string) => {
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from("leads").update({ responsavel_id: userId }).in("id", ids);
    if (error) {
      toast.error("Erro ao atribuir responsável em massa");
      return;
    }
    const userName = usersMap[userId]?.nome_completo || "Usuário";
    await logActivity("bulk_assign", `Atribuiu ${ids.length} leads para "${userName}"`, {
      lead_ids: ids,
      responsavel_id: userId,
      responsavel_nome: userName,
    });
    toast.success(`${ids.length} leads atribuídos para "${userName}"`);
    clearSelection();
    setIsBulkAssignOpen(false);
    fetchLeads();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedLeadIds);
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao excluir leads em massa");
      return;
    }
    await logActivity("bulk_delete", `Excluiu ${ids.length} leads em massa`, { lead_ids: ids });
    toast.success(`${ids.length} leads excluídos com sucesso!`);
    clearSelection();
    setIsBulkDeleteOpen(false);
    fetchLeads();
  };

  // KPIs calculation
  const kpis = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const leadsGanhosMes = leads.filter(
      (lead) => lead.etapa_funil === "Ganho" && new Date(lead.data_criacao) >= firstDayOfMonth,
    ).length;

    const valorTotal = leads.reduce((acc, lead) => {
      if (!lead.valor_produto) return acc; // ignora leads sem valor_produto preenchido
      const valor = parseFloat(lead.valor_produto);
      if (isNaN(valor)) return acc;
      return acc + getTopoDaFaixa(valor);
    }, 0);

    const taxaConversao =
      leads.length > 0 ? (leads.filter((lead) => lead.etapa_funil === "Ganho").length / leads.length) * 100 : 0;

    return {
      totalLeads: leads.length,
      leadsGanhos: leadsGanhosMes,
      taxaConversao,
      volumeTotal: valorTotal,
    };
  }, [leads]);

  const getExportLeads = useCallback(() => {
    let leadsToExport = [...filteredAndSortedLeads];

    if (exportPeriod !== "all") {
      const now = new Date();

      if (exportPeriod === "custom" && exportDateFrom && exportDateTo) {
        leadsToExport = leadsToExport.filter((lead) => {
          const leadDate = getLeadDate(lead);
          return isWithinInterval(leadDate, {
            start: startOfDay(exportDateFrom),
            end: endOfDay(exportDateTo),
          });
        });
      } else if (exportPeriod === "hoje") {
        leadsToExport = leadsToExport.filter((lead) => getLeadDate(lead).toDateString() === now.toDateString());
      } else if (exportPeriod === "ontem") {
        const yesterday = subDays(now, 1);
        leadsToExport = leadsToExport.filter((lead) => getLeadDate(lead).toDateString() === yesterday.toDateString());
      } else {
        const days = parseInt(exportPeriod);
        if (!isNaN(days)) {
          const startDate = subDays(now, days);
          leadsToExport = leadsToExport.filter((lead) => getLeadDate(lead) >= startDate);
        }
      }
    }

    return leadsToExport;
  }, [filteredAndSortedLeads, exportPeriod, exportDateFrom, exportDateTo, getLeadDate]);

  const handleExport = async () => {
    const leadsToExport = getExportLeads();

    if (leadsToExport.length === 0) {
      toast.error("Nenhum lead encontrado no período selecionado.");
      return;
    }

    const dateStr = new Date().toISOString().split("T")[0];
    if (exportFormat === "xlsx") {
      exportToXLSX(leadsToExport, usersMap, `leads_${dateStr}.xlsx`);
    } else {
      exportToCSV(leadsToExport, usersMap, `leads_${dateStr}.csv`);
    }

    const formatLabel = exportFormat === "xlsx" ? "Excel" : "CSV";
    await logActivity("lead_exported", `Exportou ${leadsToExport.length} leads para ${formatLabel}`, {
      quantidade: leadsToExport.length,
      filtros: filters,
      periodo_export: exportPeriod,
      formato: exportFormat,
    });

    toast.success(`${leadsToExport.length} leads exportados em ${formatLabel}!`);
    setIsExportPopoverOpen(false);
    setExportPeriod("all");
    setExportDateFrom(undefined);
    setExportDateTo(undefined);
  };

  const exportPeriodLabel: Record<string, string> = {
    all: "Todos",
    hoje: "Hoje",
    ontem: "Ontem",
    "7": "Últimos 7 dias",
    "15": "Últimos 15 dias",
    "30": "Últimos 30 dias",
    custom: "Personalizado",
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
      <GlobalSearch value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome, email, telefone ou notas..." />

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
          <Popover open={isExportPopoverOpen} onOpenChange={setIsExportPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                disabled={filteredAndSortedLeads.length === 0}
                aria-label="Exportar leads para CSV"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-foreground mb-1">Exportar Leads</h4>
                  <p className="text-xs text-muted-foreground">Selecione o período para exportação</p>
                </div>

                <Select value={exportPeriod} onValueChange={setExportPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="ontem">Ontem</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="15">Últimos 15 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>

                {exportPeriod === "custom" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Data início</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !exportDateFrom && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {exportDateFrom ? format(exportDateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={exportDateFrom}
                            onSelect={setExportDateFrom}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Data fim</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !exportDateTo && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {exportDateTo ? format(exportDateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={exportDateTo}
                            onSelect={setExportDateTo}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Formato</label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "xlsx")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleExport}
                  className="w-full gap-2"
                  disabled={exportPeriod === "custom" && (!exportDateFrom || !exportDateTo)}
                >
                  <Download className="h-4 w-4" />
                  Exportar {exportFormat === "xlsx" ? "Excel" : "CSV"}{" "}
                  {exportPeriod !== "all" ? `(${exportPeriodLabel[exportPeriod]})` : ""}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          {isAdmin && (
            <Button
              onClick={() => setIsImportOpen(true)}
              variant="outline"
              className="gap-2"
              aria-label="Importar leads via planilha"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
          )}
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
          onDateChange={handleDateChange}
          onClearFilters={handleClearFilters}
          totalLeads={leads.length}
          filteredLeads={filteredAndSortedLeads.length}
        />

        {/* Tabela */}
        <div className="flex-1 space-y-4" ref={tableContainerRef}>
          {/* Bulk Action Bar */}
          {selectedLeadIds.size > 0 && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 shadow-sm">
              <div className="flex items-center gap-2 mr-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""} selecionado{selectedLeadIds.size !== 1 ? "s" : ""}
                </span>
              </div>

              <Popover open={isBulkStageOpen} onOpenChange={setIsBulkStageOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    Alterar Etapa
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 py-1">Mover para:</p>
                    {etapasNomes.map((etapa) => (
                      <Button
                        key={etapa}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm whitespace-normal h-auto py-1.5 text-left"
                        onClick={() => handleBulkStageChange(etapa)}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full mr-2 shrink-0"
                          style={{ backgroundColor: coresMap[etapa] || "#6b7280" }}
                        />
                        {etapa}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {isAdmin && (
                <Popover open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />
                      Atribuir Responsável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Atribuir para:</p>
                      {users.map((u) => (
                        <Button
                          key={u.user_id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm"
                          onClick={() => handleBulkAssign(u.user_id)}
                        >
                          {u.nome_completo || u.email || "Usuário"}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              )}

              <Button size="sm" variant="ghost" className="gap-1.5 ml-auto" onClick={clearSelection}>
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={paginatedLeads.length > 0 && selectedLeadIds.size === paginatedLeads.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                       className="border-muted-foreground dark:border-slate-400"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort("nome_completo")}>
                      <div className="flex items-center gap-2">
                        Nome
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Qtd Cotas</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted" onClick={() => toggleSort("valor_produto")}>
                      <div className="flex items-center gap-2">
                        Pretensão
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Origem</TableHead>
                    {isAdmin && <TableHead>Responsável</TableHead>}
                    <TableHead>Nota</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedLeadIds.has(lead.id)}
                            onCheckedChange={() => toggleSelectLead(lead.id)}
                            aria-label={`Selecionar ${lead.nome_completo}`}
                           className="border-muted-foreground dark:border-slate-400"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lead.nome_completo}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <span>{lead.telefone || "-"}</span>
                              {lead.telefone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const digits = lead.telefone.replace(/\D/g, "");
                                    const phone = digits.startsWith("55") ? digits : `55${digits}`;
                                    navigate(`/chat?phone=${phone}&name=${encodeURIComponent(lead.nome_completo)}`);
                                  }}
                                  className="text-green-500 hover:text-green-600 transition-colors"
                                  title="Abrir chat WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                              {lead.email || "-"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{lead.volume || "-"}</TableCell>
                        <TableCell>
                          {lead.valor_produto
                            ? new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(getTopoDaFaixa(parseFloat(lead.valor_produto)))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const origens: string[] = Array.isArray(lead.origens) ? lead.origens : [];
                            const origemPrincipal = lead.origem;
                            const extraCount = origens.length > 1 ? origens.length - 1 : 0;

                            return (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {ORIGEM_LABELS[origemPrincipal] || origemPrincipal || "-"}
                                </Badge>
                                {extraCount > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 cursor-default">
                                          <Layers className="h-3 w-3 mr-0.5" />+{extraCount}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium mb-1">Origens do lead:</p>
                                        <ul className="text-xs space-y-0.5">
                                          {origens.map((o: string, i: number) => (
                                            <li key={i}>• {ORIGEM_LABELS[o] || o}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {lead.responsavel_id ? (
                              <div className="flex items-center gap-1.5 text-sm">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate max-w-[120px]">
                                  {usersMap[lead.responsavel_id]?.nome_completo || "Usuário"}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-sm text-amber-600">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Não atribuído</span>
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          {(lead as any).nota_assessor ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs text-muted-foreground truncate max-w-[100px] block cursor-default">
                                    {(lead as any).nota_assessor.length > 30
                                      ? (lead as any).nota_assessor.substring(0, 30) + "..."
                                      : (lead as any).nota_assessor}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm whitespace-pre-wrap">{(lead as any).nota_assessor}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[160px]">
                          <Badge
                            className={`${coresMap[lead.etapa_funil] || "bg-gray-500"} text-white text-xs px-2 py-0.5 max-w-full block truncate`}
                          >
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
            <div className="sticky bottom-0 z-10 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between rounded-lg border border-border bg-card p-3 shadow-elevation-1">
              <p className="text-sm text-muted-foreground text-center lg:text-left">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | string)[] = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (currentPage > 3) pages.push("...");
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);
                    for (let i = start; i <= end; i++) pages.push(i);
                    if (currentPage < totalPages - 2) pages.push("...");
                    pages.push(totalPages);
                  }
                  return pages.map((page, idx) =>
                    typeof page === "string" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={page === currentPage ? "secondary" : "outline"}
                        size="sm"
                        className="min-w-[32px]"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  );
                })()}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

      <ImportLeadsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={fetchLeads}
      />

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

      {/* Dialog de Confirmação de Exclusão em Massa */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedLeadIds.size} leads</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedLeadIds.size} lead{selectedLeadIds.size !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Excluir {selectedLeadIds.size} leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LeadsTable;
