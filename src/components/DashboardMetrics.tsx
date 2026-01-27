import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, MapPin, Bot } from "lucide-react";
import { parseVolume } from "@/lib/volumeParser";

interface DashboardMetricsProps {
  leads: any[];
}

export const DashboardMetrics = ({ leads }: DashboardMetricsProps) => {
  // Ticket Médio
  const ticketMedio = useMemo(() => {
    const leadsComValor = leads.filter(lead => lead.valor_produto && lead.volume);
    if (leadsComValor.length === 0) return 0;
    
    const soma = leadsComValor.reduce((acc, lead) => {
      const valor = parseFloat(lead.valor_produto) || 0;
      return acc + valor;
    }, 0);
    
    return soma / leadsComValor.length;
  }, [leads]);

  // Lead mais valioso
  const leadMaisValioso = useMemo(() => {
    const leadsComValor = leads.filter(lead => lead.valor_produto && lead.volume);
    if (leadsComValor.length === 0) return { nome: "N/A", valor: 0 };
    
    const maisValioso = leadsComValor.reduce((max, lead) => {
      const volume = parseVolume(lead.volume);
      const valor = parseFloat(lead.valor_produto) || 0;
      const total = volume * valor;
      
      const maxVolume = parseVolume(max.volume);
      const maxValor = parseFloat(max.valor_produto) || 0;
      const maxTotal = maxVolume * maxValor;
      
      return total > maxTotal ? lead : max;
    }, leadsComValor[0]);
    
    const volume = parseVolume(maisValioso.volume);
    const valor = parseFloat(maisValioso.valor_produto) || 0;
    
    return {
      nome: maisValioso.nome_completo,
      valor: volume * valor
    };
  }, [leads]);

  // Melhor região
  const melhorRegiao = useMemo(() => {
    const regioes: Record<string, number> = {};
    
    leads.forEach(lead => {
      if (lead.cidade && lead.volume) {
        const cidade = lead.cidade;
        const volume = parseVolume(lead.volume);
        regioes[cidade] = (regioes[cidade] || 0) + volume;
      }
    });
    
    const entries = Object.entries(regioes);
    if (entries.length === 0) return { cidade: "N/A", volume: 0 };
    
    const [cidade, volume] = entries.reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );
    
    return { cidade, volume };
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
      value: `R$ ${ticketMedio.toFixed(2)}/saca`,
      icon: DollarSign,
      color: "text-status-ganho",
      bgColor: "bg-status-ganho/10"
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
      title: "Melhor Região",
      value: melhorRegiao.cidade,
      subtitle: `${Math.round(melhorRegiao.volume).toLocaleString('pt-BR')} sacas`,
      icon: MapPin,
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
