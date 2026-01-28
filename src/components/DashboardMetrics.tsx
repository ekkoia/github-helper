import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, UserPlus, Bot } from "lucide-react";

interface DashboardMetricsProps {
  leads: any[];
}

export const DashboardMetrics = ({ leads }: DashboardMetricsProps) => {
  // Ticket Médio (Investimento Médio por Lead)
  const ticketMedio = useMemo(() => {
    const leadsComValor = leads.filter(lead => lead.valor_produto);
    if (leadsComValor.length === 0) return 0;
    
    const soma = leadsComValor.reduce((acc, lead) => {
      const valor = parseFloat(lead.valor_produto) || 0;
      return acc + valor;
    }, 0);
    
    return soma / leadsComValor.length;
  }, [leads]);

  // Lead mais valioso (baseado apenas no valor_produto)
  const leadMaisValioso = useMemo(() => {
    const leadsComValor = leads.filter(lead => lead.valor_produto);
    if (leadsComValor.length === 0) return { nome: "N/A", valor: 0 };
    
    const maisValioso = leadsComValor.reduce((max, lead) => {
      const valor = parseFloat(lead.valor_produto) || 0;
      const maxValor = parseFloat(max.valor_produto) || 0;
      return valor > maxValor ? lead : max;
    }, leadsComValor[0]);
    
    return {
      nome: maisValioso.nome_completo,
      valor: parseFloat(maisValioso.valor_produto) || 0
    };
  }, [leads]);

  // Leads Este Mês
  const leadsEsteMes = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    
    const leadsDoMes = leads.filter(lead => {
      const dataCriacao = new Date(lead.data_criacao);
      return dataCriacao.getMonth() === mesAtual && dataCriacao.getFullYear() === anoAtual;
    });
    
    const nomeMes = now.toLocaleDateString('pt-BR', { month: 'long' });
    
    return {
      quantidade: leadsDoMes.length,
      nomeMes: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
    };
  }, [leads]);

  // Taxa de resposta IA
  const taxaRespostaIA = useMemo(() => {
    const totalLeads = leads.length;
    if (totalLeads === 0) return 0;
    
    const leadsIA = leads.filter(lead => 
      lead.etapa_funil === "Em atendimento IA" || 
      lead.etapa_funil === "Atendimento Humano" ||
      lead.etapa_funil === "Reunião Agendada" ||
      lead.etapa_funil === "Proposta Enviada" ||
      lead.etapa_funil === "Ganho"
    ).length;
    
    return (leadsIA / totalLeads) * 100;
  }, [leads]);

  const metrics = [
    {
      title: "Ticket Médio",
      value: `R$ ${ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "Investimento médio por lead",
      icon: DollarSign,
      color: "text-status-ganho dark:text-secondary",
      bgColor: "bg-status-ganho/20 dark:bg-secondary/20"
    },
    {
      title: "Lead Mais Valioso",
      value: leadMaisValioso.nome,
      subtitle: `R$ ${leadMaisValioso.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-status-proposta",
      bgColor: "bg-status-proposta/10"
    },
    {
      title: "Leads Este Mês",
      value: `${leadsEsteMes.quantidade} leads`,
      subtitle: `Novos em ${leadsEsteMes.nomeMes}`,
      icon: UserPlus,
      color: "text-status-ia",
      bgColor: "bg-status-ia/10"
    },
    {
      title: "Taxa de Resposta IA",
      value: `${taxaRespostaIA.toFixed(1)}%`,
      subtitle: "Leads processados pelo Clóvis",
      icon: Bot,
      color: "text-status-humano",
      bgColor: "bg-status-humano/10"
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
