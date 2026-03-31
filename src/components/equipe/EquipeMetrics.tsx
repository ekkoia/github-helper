import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, UserX, TrendingUp } from "lucide-react";

interface EquipeMetricsProps {
  leads: any[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null }>;
}

export const EquipeMetrics = ({ leads, usersMap }: EquipeMetricsProps) => {
  const assessoresAtivos = useMemo(() => {
    const ids = new Set(leads.filter(l => l.responsavel_id).map(l => l.responsavel_id));
    return ids.size;
  }, [leads]);

  const leadsComResponsavel = useMemo(() => {
    return leads.filter(l => l.responsavel_id).length;
  }, [leads]);

  const leadsSemAssessor = useMemo(() => {
    return leads.filter(l => !l.responsavel_id).length;
  }, [leads]);

  const taxaConversao = useMemo(() => {
    if (leads.length === 0) return 0;
    const etapasFinais = ["Ganho", "Convertido", "Cliente"];
    const convertidos = leads.filter(l =>
      etapasFinais.some(e => l.etapa_funil?.toLowerCase().includes(e.toLowerCase()))
    ).length;
    return (convertidos / leads.length) * 100;
  }, [leads]);

  const metrics = [
    {
      title: "Assessores Ativos",
      value: assessoresAtivos.toString(),
      subtitle: "Com leads atribuídos",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Leads na Carteira",
      value: leadsComResponsavel.toString(),
      subtitle: "Com responsável definido",
      icon: Briefcase,
      color: "text-status-ganho dark:text-secondary",
      bgColor: "bg-status-ganho/20 dark:bg-secondary/20",
    },
    {
      title: "Sem Assessor",
      value: leadsSemAssessor.toString(),
      subtitle: "Aguardando atribuição",
      icon: UserX,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Taxa de Conversão",
      value: `${taxaConversao.toFixed(1)}%`,
      subtitle: "Leads em etapas finais",
      icon: TrendingUp,
      color: "text-status-proposta",
      bgColor: "bg-status-proposta/10",
    },
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
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
