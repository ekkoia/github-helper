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
import { X, AlertCircle, User } from "lucide-react";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import { Separator } from "@/components/ui/separator";

interface FiltersSidebarProps {
  filters: {
    etapa: string;
    protocolo: string;
    responsavel?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  totalLeads?: number;
  filteredLeads?: number;
}

export const FiltersSidebar = ({
  filters,
  onFilterChange,
  onClearFilters,
  totalLeads = 0,
  filteredLeads = 0
}: FiltersSidebarProps) => {
  const { etapasNomes, isLoading: isLoadingEtapas } = useFunilEtapas();
  const { users, loading: isLoadingUsers } = useUsers();
  const { isAdmin } = useUserRole();
  
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
