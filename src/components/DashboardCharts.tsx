import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

import { 
  LineChart, 
  Line,
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface DashboardChartsProps {
  leads: any[];
}

const ETAPA_COLORS: Record<string, string> = {
  "Novo Lead": "hsl(211, 70%, 58%)",
  "Em atendimento IA": "hsl(85, 100%, 40%)",
  "Atendimento Humano": "hsl(43, 98%, 54%)",
  "Reunião Agendada": "hsl(24, 100%, 63%)",
  "Proposta Enviada": "hsl(276, 47%, 55%)",
  "Ganho": "hsl(156, 26%, 17%)",
  "Perdido": "hsl(4, 74%, 57%)",
  "Sem interesse": "hsl(184, 6%, 59%)",
  "Ghost": "hsl(200, 6%, 54%)",
  "Nutrir": "hsl(204, 70%, 53%)"
};

const PERFIL_COLORS = [
  "hsl(156, 26%, 17%)", // Verde escuro
  "hsl(85, 100%, 40%)", // Verde vibrante
  "hsl(156, 40%, 35%)"  // Verde médio
];

const INVESTIMENTO_COLORS = [
  "hsl(85, 100%, 40%)",   // Verde vibrante
  "hsl(43, 98%, 54%)",    // Amarelo
  "hsl(24, 100%, 63%)",   // Laranja
  "hsl(156, 26%, 17%)"    // Verde escuro
];

export const DashboardCharts = ({ leads }: DashboardChartsProps) => {
  const [period, setPeriod] = useState("30");
  const [customDateFrom, setCustomDateFrom] = useState<Date>();
  const [customDateTo, setCustomDateTo] = useState<Date>();
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Filtrar leads por período
  const filteredLeads = useMemo(() => {
    const now = new Date();
    
    if (period === "custom" && customDateFrom && customDateTo) {
      return leads.filter(lead => {
        const leadDate = new Date(lead.data_criacao);
        return isWithinInterval(leadDate, {
          start: startOfDay(customDateFrom),
          end: endOfDay(customDateTo)
        });
      });
    }
    
    if (period === "hoje") {
      return leads.filter(lead => {
        const leadDate = new Date(lead.data_criacao);
        return leadDate.toDateString() === now.toDateString();
      });
    }
    
    if (period === "ontem") {
      const yesterday = subDays(now, 1);
      return leads.filter(lead => {
        const leadDate = new Date(lead.data_criacao);
        return leadDate.toDateString() === yesterday.toDateString();
      });
    }
    
    const days = parseInt(period);
    const startDate = subDays(now, days);
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.data_criacao);
      return leadDate >= startDate;
    });
  }, [leads, period, customDateFrom, customDateTo]);

  // Dados para o gráfico de linha (Volume de Negociações)
  const volumeData = useMemo(() => {
    const now = new Date();
    let daysToShow = 30;
    
    if (period === "hoje") daysToShow = 1;
    else if (period === "ontem") daysToShow = 2;
    else if (period === "7") daysToShow = 7;
    else if (period === "15") daysToShow = 15;
    else if (period === "30") daysToShow = 30;
    else if (period === "custom" && customDateFrom && customDateTo) {
      daysToShow = Math.ceil((customDateTo.getTime() - customDateFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Criar mapa de contagem de leads por data
    const leadsCountByDate: Record<string, number> = {};
    
    filteredLeads.forEach(lead => {
      const leadDate = new Date(lead.data_criacao);
      const dateKey = format(leadDate, "dd/MM");
      leadsCountByDate[dateKey] = (leadsCountByDate[dateKey] || 0) + 1;
    });

    // Criar array com todos os dias do período
    const chartData = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = subDays(now, daysToShow - i - 1);
      const dateKey = format(date, "dd/MM");
      
      chartData.push({
        date: dateKey,
        count: leadsCountByDate[dateKey] || 0
      });
    }

    return chartData;
  }, [filteredLeads, period, customDateFrom, customDateTo]);

  // Dados para o funil de conversão
  const funnelData = useMemo(() => {
    const etapas: Record<string, number> = {};
    
    filteredLeads.forEach(lead => {
      const etapa = lead.etapa_funil || "Novo Lead";
      etapas[etapa] = (etapas[etapa] || 0) + 1;
    });

    return Object.entries(etapas)
      .map(([etapa, count]) => ({ etapa, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads]);

  // Dados para distribuição por perfil
  const perfilData = useMemo(() => {
    const perfis: Record<string, number> = {};
    
    filteredLeads.forEach(lead => {
      const perfil = lead.perfil || "Não especificado";
      perfis[perfil] = (perfis[perfil] || 0) + 1;
    });

    return Object.entries(perfis).map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

  // Dados para distribuição por faixa de investimento
  const investimentoData = useMemo(() => {
    const faixas: Record<string, number> = {
      "até R$10 mil": 0,
      "de R$10 mil a R$50 mil": 0,
      "de R$50 mil a R$100 mil": 0,
      "acima de R$100 mil": 0
    };
    
    filteredLeads.forEach(lead => {
      const valor = parseFloat(lead.valor_produto) || 0;
      
      if (valor <= 10000) faixas["até R$10 mil"]++;
      else if (valor <= 50000) faixas["de R$10 mil a R$50 mil"]++;
      else if (valor <= 100000) faixas["de R$50 mil a R$100 mil"]++;
      else if (valor > 100000) faixas["acima de R$100 mil"]++;
    });

    return Object.entries(faixas)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredLeads]);

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

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-[22px] font-semibold text-foreground">Análise de Dados</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

      {/* Grid de Gráficos 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Volume de Negociações */}
        <Card className="col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Volume de Negociações</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Leads criados no período</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5bcc00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#5bcc00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  domain={[0, 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#5bcc00" 
                  strokeWidth={3}
                  fill="url(#colorLeads)"
                  name="Leads"
                  dot={{ fill: '#5bcc00', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras Horizontais - Funil de Conversão */}
        <Card className="col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Funil de Conversão</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Distribuição por etapa</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                <YAxis 
                  type="category" 
                  dataKey="etapa" 
                  width={150}
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Bar dataKey="count" name="Quantidade">
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ETAPA_COLORS[entry.etapa] || "hsl(204, 12%, 90%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição por Perfil */}
        <Card className="col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Distribuição por Perfil</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Leads por tipo de cliente</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={perfilData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 25;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="hsl(var(--foreground))"
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                        className="text-sm font-medium"
                      >
                        {`${name}: ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={{ stroke: 'hsl(var(--border))' }}
                >
                  {perfilData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PERFIL_COLORS[index % PERFIL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras Verticais - Leads por Faixa de Investimento */}
        <Card className="col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Leads por Faixa de Investimento</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Distribuição por valor pretendido</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={investimentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '11px' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{
                    color: 'hsl(var(--popover-foreground))'
                  }}
                />
                <Bar dataKey="value" name="Quantidade de Leads">
                  {investimentoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={INVESTIMENTO_COLORS[index % INVESTIMENTO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
