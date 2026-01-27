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
import { X } from "lucide-react";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

interface FiltersSidebarProps {
  filters: {
    perfil: string;
    cidade: string;
    uf: string;
    etapa: string;
    tipo_grao: string;
    intencao: string;
    protocolo: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  cidades: string[];
  totalLeads?: number;
  filteredLeads?: number;
}

export const FiltersSidebar = ({
  filters,
  onFilterChange,
  onClearFilters,
  cidades,
  totalLeads = 0,
  filteredLeads = 0
}: FiltersSidebarProps) => {
  const { etapasNomes, isLoading: isLoadingEtapas } = useFunilEtapas();
  const hasActiveFilters = Object.values(filters).some(value => value !== "all" && value !== "");

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
        <div>
          <Label className="text-sm">Perfil</Label>
          <Select value={filters.perfil} onValueChange={(value) => onFilterChange("perfil", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Produtor">Produtor</SelectItem>
              <SelectItem value="Corretor">Corretor</SelectItem>
              <SelectItem value="Armazém">Armazém</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
          <Label className="text-sm">Tipo de Grão</Label>
          <Select value={filters.tipo_grao} onValueChange={(value) => onFilterChange("tipo_grao", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Soja">Soja</SelectItem>
              <SelectItem value="Milho">Milho</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Intenção</Label>
          <Select value={filters.intencao} onValueChange={(value) => onFilterChange("intencao", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Comprar">Comprar</SelectItem>
              <SelectItem value="Vender">Vender</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">UF</Label>
          <Select value={filters.uf} onValueChange={(value) => onFilterChange("uf", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {ESTADOS_BR.map((estado) => (
                <SelectItem key={estado} value={estado}>{estado}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm">Cidade</Label>
          <Select value={filters.cidade} onValueChange={(value) => onFilterChange("cidade", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>{cidade}</SelectItem>
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
      </div>
    </div>
  );
};
