import { TrendingUp, Users, Target, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardProps {
  totalLeads: number;
  leadsGanhos: number;
  taxaConversao: number;
  volumeTotal: number;
}

export const Dashboard = ({ totalLeads, leadsGanhos, taxaConversao, volumeTotal }: DashboardProps) => {
  const stats = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      color: "text-status-novo",
    },
    {
      title: "Leads Ganhos (mês)",
      value: leadsGanhos,
      icon: Target,
      color: "text-status-ganho",
    },
    {
      title: "Taxa de Conversão",
      value: `${taxaConversao.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-status-ia",
    },
    {
      title: "Volume Total (sacas)",
      value: volumeTotal.toLocaleString('pt-BR'),
      icon: Package,
      color: "text-status-proposta",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden rounded-xl p-8 md:p-12"
        style={{
          background: 'linear-gradient(135deg, #254239 0%, #1a2f28 100%)',
        }}
      >
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Dashboard de Negociação
          </h2>
          <p className="text-white/80 text-sm md:text-base">
            Acompanhe seus indicadores em tempo real
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className="relative overflow-hidden group cursor-pointer"
              role="article"
              aria-label={`${stat.title}: ${stat.value}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color} transition-transform duration-300 group-hover:scale-110`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
