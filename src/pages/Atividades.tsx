import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Filter, Search, CalendarIcon, User } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActivityTypeLabel, getActivityTypeIcon } from "@/hooks/useActivityLog";
import { AtividadesMetrics } from "@/components/atividades/AtividadesMetrics";
import { AtividadesCharts } from "@/components/atividades/AtividadesCharts";
import { AtividadesLista } from "@/components/atividades/AtividadesLista";

interface ActivityWithUser {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  user_name: string;
  user_email: string;
}

const Atividades = () => {
  const { role, loading: roleLoading } = useUserRole();
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [period, setPeriod] = useState("30");
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [showCustomDates, setShowCustomDates] = useState(false);

  const canAccess = role === 'admin' || role === 'global';

  useEffect(() => {
    if (!roleLoading && canAccess) {
      fetchActivities();
    }
  }, [roleLoading, canAccess]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("user_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (activitiesError) throw activitiesError;

      if (!activitiesData || activitiesData.length === 0) {
        setActivities([]);
        return;
      }

      const userIds = [...new Set(activitiesData.map(a => a.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, nome_completo, email")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const activitiesWithUsers: ActivityWithUser[] = activitiesData.map(activity => {
        const profile = profiles?.find(p => p.user_id === activity.user_id);
        return {
          ...activity,
          metadata: activity.metadata as Record<string, any>,
          user_name: profile?.nome_completo || "Usuário desconhecido",
          user_email: profile?.email || "",
        };
      });

      setActivities(activitiesWithUsers);
    } catch (error: any) {
      console.error("Erro ao buscar atividades:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lista de usuários únicos para o filtro (baseado em todas as atividades)
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map<string, { user_id: string; user_name: string }>();
    activities.forEach(a => {
      if (!usersMap.has(a.user_id)) {
        usersMap.set(a.user_id, { user_id: a.user_id, user_name: a.user_name });
      }
    });
    return Array.from(usersMap.values()).sort((a, b) => a.user_name.localeCompare(b.user_name));
  }, [activities]);

  // Filtrar atividades por período
  const periodFilteredActivities = useMemo(() => {
    const now = new Date();
    
    if (period === "custom" && customDateFrom && customDateTo) {
      return activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        return isWithinInterval(activityDate, {
          start: startOfDay(customDateFrom),
          end: endOfDay(customDateTo)
        });
      });
    }
    
    if (period === "hoje") {
      return activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        return activityDate.toDateString() === now.toDateString();
      });
    }
    
    if (period === "ontem") {
      const yesterday = subDays(now, 1);
      return activities.filter(activity => {
        const activityDate = new Date(activity.created_at);
        return activityDate.toDateString() === yesterday.toDateString();
      });
    }
    
    const days = parseInt(period);
    const startDate = subDays(now, days);
    
    return activities.filter(activity => {
      const activityDate = new Date(activity.created_at);
      return activityDate >= startDate;
    });
  }, [activities, period, customDateFrom, customDateTo]);

  // Filtrar por usuário (afeta métricas, gráficos e lista)
  const userFilteredActivities = useMemo(() => {
    if (filterUser === "all") return periodFilteredActivities;
    return periodFilteredActivities.filter(activity => activity.user_id === filterUser);
  }, [periodFilteredActivities, filterUser]);

  // Filtrar por busca e tipo (apenas para a lista)
  const filteredActivities = userFilteredActivities.filter(activity => {
    const matchesSearch = 
      activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || activity.activity_type === filterType;
    return matchesSearch && matchesType;
  });

  const activityTypes = [...new Set(activities.map(a => a.activity_type))];

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value === "custom") {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
    }
  };

  const applyCustomDates = () => {
    if (customDateFrom && customDateTo) {
      setShowCustomDates(false);
    }
  };

  if (roleLoading) {
    return null;
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Atividades</h1>
              <p className="text-muted-foreground">Acompanhe todas as atividades do sistema</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-[200px] border-[#E0E6ED] hover:border-secondary transition-colors">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.user_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[200px] border-[#E0E6ED] hover:border-secondary transition-colors">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="ontem">Ontem</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {showCustomDates && (
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "w-full sm:w-[160px] justify-start text-left font-normal border-[#E0E6ED] hover:border-secondary transition-colors",
                          !customDateFrom && "text-muted-foreground"
                        )}
                      >
                        {customDateFrom ? format(customDateFrom, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                        <CalendarIcon className="ml-auto h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                        initialFocus
                        locale={ptBR}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className={cn(
                          "w-full sm:w-[160px] justify-start text-left font-normal border-[#E0E6ED] hover:border-secondary transition-colors",
                          !customDateTo && "text-muted-foreground"
                        )}
                      >
                        {customDateTo ? format(customDateTo, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                        <CalendarIcon className="ml-auto h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                        initialFocus
                        locale={ptBR}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>

                  <Button 
                    onClick={applyCustomDates} 
                    className="w-full sm:w-auto bg-secondary hover:bg-secondary/90 text-white"
                    disabled={!customDateFrom || !customDateTo}
                  >
                    Aplicar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <AtividadesMetrics activities={userFilteredActivities} />

        {/* Gráficos */}
        <AtividadesCharts activities={userFilteredActivities} period={period} customDateFrom={customDateFrom} customDateTo={customDateTo} />

        {/* Filtros de busca e tipo */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atividades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as atividades</SelectItem>
              {activityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getActivityTypeIcon(type)} {getActivityTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Atividades */}
        <AtividadesLista activities={filteredActivities} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default Atividades;
