import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Download, CalendarIcon } from "lucide-react";
import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface EquipeExportProps {
  leads: any[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null; email: string | null; avatar_url: string | null }>;
}

const getLeadDate = (lead: any): Date => {
  if (lead.created_time_brasil) {
    const dateStr = String(lead.created_time_brasil).substring(0, 10);
    const parsed = new Date(dateStr + "T12:00:00");
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(lead.data_criacao);
};

export const EquipeExport = ({ leads, usersMap }: EquipeExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState("all");
  const [exportDateFrom, setExportDateFrom] = useState<Date | undefined>();
  const [exportDateTo, setExportDateTo] = useState<Date | undefined>();
  const [exportFormat, setExportFormat] = useState("csv");

  const filteredLeads = useMemo(() => {
    if (exportPeriod === "all") return leads;
    const now = new Date();

    if (exportPeriod === "custom") {
      if (!exportDateFrom || !exportDateTo) return leads;
      return leads.filter((lead) => {
        const d = getLeadDate(lead);
        return isWithinInterval(d, { start: startOfDay(exportDateFrom), end: endOfDay(exportDateTo) });
      });
    }

    const daysBack = exportPeriod === "0" ? 0 : exportPeriod === "1" ? 1 : parseInt(exportPeriod);
    const start = startOfDay(subDays(now, daysBack));
    const end = endOfDay(now);

    return leads.filter((lead) => {
      const d = getLeadDate(lead);
      return isWithinInterval(d, { start, end });
    });
  }, [leads, exportPeriod, exportDateFrom, exportDateTo]);

  const handleExport = () => {
    if (filteredLeads.length === 0) return;
    if (exportFormat === "csv") {
      exportToCSV(filteredLeads, usersMap, "equipe-leads.csv");
    } else {
      exportToXLSX(filteredLeads, usersMap, "equipe-leads.xlsx");
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <Select value={exportPeriod} onValueChange={(v) => { setExportPeriod(v); if (v !== "custom") { setExportDateFrom(undefined); setExportDateTo(undefined); } }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Hoje</SelectItem>
                <SelectItem value="1">Ontem</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportPeriod === "custom" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">De</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !exportDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportDateFrom ? format(exportDateFrom, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={exportDateFrom} onSelect={setExportDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Até</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !exportDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportDateTo ? format(exportDateTo, "dd/MM/yyyy") : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={exportDateTo} onSelect={setExportDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Formato</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExport} className="w-full gap-2" disabled={filteredLeads.length === 0}>
            <Download className="h-4 w-4" />
            Exportar {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
