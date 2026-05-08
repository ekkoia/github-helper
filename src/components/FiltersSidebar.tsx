import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, AlertCircle, User, CalendarIcon } from "lucide-react";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ORIGEM_OPTIONS = [
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meta_form", label: "Formulário Nativo Meta" },
  { value: "formulario_meta", label: "Formulário Nativo Meta" },
  { value: "campanha_mensagem", label: "Campanha de Mensagem" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site/Landing Page" },
  { value: "importacao_planilha", label: "Importação" },
  { value: "outro", label: "Outro" },
];

interface FiltersSidebarProps {
  filters: {
    etapa: string;
    protocolo: string;
    responsavel?: string;
    origem?: string;
    campanha?: string;
    periodo?: string;
    dataInicio?: Date;
    dataFim?: Date;
  };
  onFilterChange: (key: string, value: string) => void;
  onDateChange?: (key: string, value: Date | undefined) => void;
  onClearFilters: () => void;
  totalLeads?: number;
  filteredLeads?: number;
}

export const FiltersSidebar = ({
  filters,
  onFilterChange,
  onDateChange,
  onClearFilters,
  totalLeads = 0,
  filteredLeads = 0
}: FiltersSidebarProps) => {
  const { etapasNomes, isLoading: isLoadingEtapas } = useFunilEtapas();
  const { users, loading: isLoadingUsers } = useUsers();
  const { isAdmin } = useUserRole();
  const [campanhas, setCampanhas] = useState<string[]>([]);
  
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "dataInicio" || key === "dataFim") return !!value;
    return value !== "all" && value !== "";
  });

  // Buscar campanhas distintas
  useEffect(() => {
    const fetchCampanhas = async () => {
      const { data, error } = await supabase
        .from("leadsNativo_feeagro")
        .select("adset_name");
      
      if (!error && data) {
        const unique = [...new Set(data.map(d => d.adset_name).filter(Boolean))] as string[];
        setCampanhas(unique.sort());
      }
    };
    fetchCampanhas();
  }, []);

  const showCustomDates = filters.periodo === "custom";

  return (
    <div className="w-full lg:w-64 space-y-4 bg-card p-4 rounded-lg border border-border shadow-card lg:sticky lg:top-20 lg:self-start">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {totalLeads > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          Mostrando <span className="font-semibold text-foreground">{filteredLeads}</span> de <span className="font-semibold text-foreground">{totalLeads}</span> leads
        </div>
      )}

      <div className="space-y-3">
        {/* Filtro por Período */}
        <div>
          <Label className="text-sm">Período</Label>
          <Select value={filters.periodo || "all"} onValueChange={(value) => onFilterChange("periodo", value)}>
            <SelectTrigger>
              <SelectValue />
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
        </div>

        {showCustomDates && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !filters.dataInicio && "text-muted-foreground"
                    )}
                  >
                    {filters.dataInicio ? format(filters.dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                    <CalendarIcon className="ml-auto h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataInicio}
                    onSelect={(date) => onDateChange?.("dataInicio", date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !filters.dataFim && "text-muted-foreground"
                    )}
                  >
                    {filters.dataFim ? format(filters.dataFim, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                    <CalendarIcon className="ml-auto h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dataFim}
                    onSelect={(date) => onDateChange?.("dataFim", date)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <Separator className="my-2" />

        <div>
          <Label className="text-sm">Etapa do Funil</Label>
          <Select value={filters.etapa} onValueChange={(value) => onFilterChange("etapa", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {etapasNomes.map((etapa) => (
                <SelectItem key={etapa} value={etapa}>{etapa}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Protocolo</Label>
          <Input
            value={filters.protocolo}
            onChange={(e) => onFilterChange("protocolo", e.target.value)}
            placeholder="Buscar protocolo..."
          />
        </div>

        {/* Filtro por Origem */}
        <div>
          <Label className="text-sm">Origem</Label>
          <Select value={filters.origem || "all"} onValueChange={(value) => onFilterChange("origem", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {ORIGEM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Campanha */}
        <div>
          <Label className="text-sm">Campanha</Label>
          <Select value={filters.campanha || "all"} onValueChange={(value) => onFilterChange("campanha", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {campanhas.map((campanha) => (
                <SelectItem key={campanha} value={campanha}>{campanha}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Responsável - apenas para admins */}
        {isAdmin && (
          <>
            <Separator className="my-2" />
            <div>
              <Label className="text-sm">Responsável</Label>
              <Select 
                value={filters.responsavel || "all"} 
                onValueChange={(value) => onFilterChange("responsavel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Todos
                    </span>
                  </SelectItem>
                  <SelectItem value="unassigned">
                    <span className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Não atribuídos
                    </span>
                  </SelectItem>
                  <Separator className="my-1" />
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <span className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        {user.nome_completo || user.email || "Usuário"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
