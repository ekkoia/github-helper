import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Calendar, TrendingUp } from "lucide-react";
import { isToday, isThisWeek } from "date-fns";

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

interface AtividadesMetricsProps {
  activities: ActivityWithUser[];
}

export const AtividadesMetrics = ({ activities }: AtividadesMetricsProps) => {
  const totalAtividades = activities.length;

  const atividadesHoje = useMemo(() => {
    return activities.filter(a => isToday(new Date(a.created_at))).length;
  }, [activities]);

  const atividadesSemana = useMemo(() => {
    return activities.filter(a => isThisWeek(new Date(a.created_at))).length;
  }, [activities]);

  const usuarioMaisAtivo = useMemo(() => {
    const contagem: Record<string, { count: number; name: string }> = {};
    
    activities.forEach(a => {
      if (!contagem[a.user_id]) {
        contagem[a.user_id] = { count: 0, name: a.user_name };
      }
      contagem[a.user_id].count++;
    });

    const entries = Object.entries(contagem);
    if (entries.length === 0) return { name: "N/A", count: 0 };

    const [, data] = entries.reduce((max, entry) => 
      entry[1].count > max[1].count ? entry : max
    );

    return data;
  }, [activities]);

  const metrics = [
    {
      title: "Total de Atividades",
      value: totalAtividades.toString(),
      subtitle: "Registradas no sistema",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Atividades Hoje",
      value: atividadesHoje.toString(),
      subtitle: "Nas últimas 24 horas",
      icon: Calendar,
      color: "text-status-ganho",
      bgColor: "bg-status-ganho/10"
    },
    {
      title: "Esta Semana",
      value: atividadesSemana.toString(),
      subtitle: "Últimos 7 dias",
      icon: TrendingUp,
      color: "text-status-proposta",
      bgColor: "bg-status-proposta/10"
    },
    {
      title: "Usuário Mais Ativo",
      value: usuarioMaisAtivo.name,
      subtitle: `${usuarioMaisAtivo.count} atividades`,
      icon: Users,
      color: "text-status-ia",
      bgColor: "bg-status-ia/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground truncate" title={metric.value}>
                {metric.value}
              </div>
              {metric.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
