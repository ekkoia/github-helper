import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";
import { useUsers } from "@/hooks/useUsers";
import { Navigate } from "react-router-dom";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { EquipeMetrics } from "@/components/equipe/EquipeMetrics";
import { EquipeTable } from "@/components/equipe/EquipeTable";
import { EquipeCharts } from "@/components/equipe/EquipeCharts";
import { EquipeExport } from "@/components/equipe/EquipeExport";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRealtimeTable, useVisiblePolling } from "@/hooks/useRealtimeTable";

const getLeadDate = (lead: any): Date => {
  if (lead.created_time_brasil) {
    const dateStr = String(lead.created_time_brasil).substring(0, 10);
    const parsed = new Date(dateStr + "T12:00:00");
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date(lead.data_criacao);
};

const Equipe = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { users, usersMap, loading: usersLoading } = useUsers();
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

  const hasLoadedRef = useState({ done: false })[0];
  const refetch = () => {
    if (!isAdmin) return;
    if (!hasLoadedRef.done) setLeadsLoading(true);
    fetchAllLeads()
      .then((d) => { setLeads(d); hasLoadedRef.done = true; })
      .catch(console.error)
      .finally(() => setLeadsLoading(false));
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Auto-refresh: realtime + polling a cada 60s enquanto a aba está visível
  useRealtimeTable(() => refetch(), { table: "leads", channelKey: "equipe", debounceMs: 800, enabled: isAdmin });
  useVisiblePolling(() => refetch(), 60_000, isAdmin);

  const filteredLeads = useMemo(() => {
    if (period === "all") return leads;
    const now = new Date();

    if (period === "custom") {
      if (!customDateFrom || !customDateTo) return leads;
      return leads.filter(lead => {
        const d = getLeadDate(lead);
        return isWithinInterval(d, { start: startOfDay(customDateFrom), end: endOfDay(customDateTo) });
      });
    }

    let daysBack: number;
    if (period === "0") daysBack = 0;
    else if (period === "1") daysBack = 1;
    else daysBack = parseInt(period);

    const start = startOfDay(subDays(now, daysBack));
    const end = endOfDay(now);

    return leads.filter(lead => {
      const d = getLeadDate(lead);
      return isWithinInterval(d, { start, end });
    });
  }, [leads, period, customDateFrom, customDateTo]);

  if (roleLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const loading = usersLoading || leadsLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Equipe</h1>
            <p className="text-muted-foreground">
              Visão consolidada da operação comercial
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => { setPeriod(v); if (v !== "custom") { setCustomDateFrom(undefined); setCustomDateTo(undefined); } }}>
              <SelectTrigger className="w-[160px]">
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

            {period === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, "dd/MM/yyyy") : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, "dd/MM/yyyy") : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </>
            )}

            {!loading && <EquipeExport leads={filteredLeads} usersMap={usersMap} />}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[380px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <EquipeMetrics leads={filteredLeads} usersMap={usersMap} />
            <EquipeTable leads={filteredLeads} usersMap={usersMap} />
            <EquipeCharts leads={filteredLeads} usersMap={usersMap} />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Equipe;
