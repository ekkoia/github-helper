import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFunilEtapas } from "@/hooks/useFunilEtapas";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = [
  "hsl(85, 100%, 40%)", "hsl(210, 90%, 55%)", "hsl(35, 95%, 55%)",
  "hsl(280, 65%, 55%)", "hsl(350, 75%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(142, 70%, 45%)", "hsl(45, 90%, 50%)", "hsl(320, 60%, 50%)",
  "hsl(160, 50%, 40%)",
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  itemStyle: { color: "hsl(var(--popover-foreground))" },
  labelStyle: { color: "hsl(var(--popover-foreground))" },
};

interface EquipeChartsProps {
  leads: any[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null }>;
}

export const EquipeCharts = ({ leads, usersMap }: EquipeChartsProps) => {
  const { coresMap } = useFunilEtapas();

  // Get unique assessor names with leads
  const assessorNames = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach(l => {
      if (l.responsavel_id && !map[l.responsavel_id]) {
        map[l.responsavel_id] = usersMap[l.responsavel_id]?.nome_completo || "Desconhecido";
      }
    });
    return map;
  }, [leads, usersMap]);

  // 1. Leads por Assessor (Bar)
  const leadsPorAssessor = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      if (!l.responsavel_id) return;
      const nome = assessorNames[l.responsavel_id] || "Desconhecido";
      counts[nome] = (counts[nome] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [leads, assessorNames]);

  // 2. Leads por Etapa por Assessor (Stacked Bar)
  const etapasPorAssessor = useMemo(() => {
    const dataMap: Record<string, Record<string, number>> = {};
    const allEtapas = new Set<string>();

    leads.forEach(l => {
      if (!l.responsavel_id) return;
      const nome = assessorNames[l.responsavel_id] || "Desconhecido";
      const etapa = l.etapa_funil || "Sem etapa";
      allEtapas.add(etapa);
      if (!dataMap[nome]) dataMap[nome] = {};
      dataMap[nome][etapa] = (dataMap[nome][etapa] || 0) + 1;
    });

    const etapasArr = Array.from(allEtapas);
    return {
      data: Object.entries(dataMap).map(([nome, etapas]) => ({ nome, ...etapas })),
      etapas: etapasArr,
    };
  }, [leads, assessorNames]);

  // 3. Evolução Pipeline (Area - últimos 30 dias)
  const evolucaoData = useMemo(() => {
    const now = new Date();
    const days = 30;
    const assessorIds = Object.keys(assessorNames).slice(0, 5); // top 5
    const dateMap: Record<string, Record<string, number>> = {};

    for (let i = 0; i < days; i++) {
      const d = format(subDays(now, days - i - 1), "dd/MM");
      dateMap[d] = {};
      assessorIds.forEach(id => { dateMap[d][assessorNames[id]] = 0; });
    }

    leads.forEach(l => {
      if (!l.responsavel_id || !assessorIds.includes(l.responsavel_id)) return;
      const d = format(new Date(l.data_criacao), "dd/MM");
      const nome = assessorNames[l.responsavel_id];
      if (dateMap[d]) dateMap[d][nome] = (dateMap[d][nome] || 0) + 1;
    });

    return {
      data: Object.entries(dateMap).map(([date, vals]) => ({ date, ...vals })),
      names: assessorIds.map(id => assessorNames[id]),
    };
  }, [leads, assessorNames]);

  // 4. Taxa de Conversão por Assessor
  const conversaoData = useMemo(() => {
    const etapasFinais = ["ganho", "convertido", "cliente"];
    const byUser: Record<string, { total: number; convertidos: number }> = {};

    leads.forEach(l => {
      if (!l.responsavel_id) return;
      const nome = assessorNames[l.responsavel_id] || "Desconhecido";
      if (!byUser[nome]) byUser[nome] = { total: 0, convertidos: 0 };
      byUser[nome].total++;
      if (etapasFinais.some(e => l.etapa_funil?.toLowerCase().includes(e))) {
        byUser[nome].convertidos++;
      }
    });

    return Object.entries(byUser)
      .map(([nome, d]) => ({
        nome,
        taxa: d.total > 0 ? Math.round((d.convertidos / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [leads, assessorNames]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Leads por Assessor */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Leads por Assessor</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Quantidade total de leads</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsPorAssessor}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="total" name="Leads" radius={[4, 4, 0, 0]}>
                {leadsPorAssessor.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Leads por Etapa por Assessor */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Etapas por Assessor</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Distribuição de pipeline</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={etapasPorAssessor.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              {etapasPorAssessor.etapas.map((etapa, i) => (
                <Bar key={etapa} dataKey={etapa} stackId="a" fill={coresMap[etapa] || COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Evolução do Pipeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Evolução do Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Leads criados nos últimos 30 dias</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolucaoData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} interval="preserveStartEnd" minTickGap={30} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              {evolucaoData.names.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. Taxa de Conversão por Assessor */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Conversão por Assessor</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">% de leads em etapas finais</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversaoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="nome" width={120} stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => `${value}%`} />
              <Bar dataKey="taxa" name="Conversão" radius={[0, 4, 4, 0]}>
                {conversaoData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
