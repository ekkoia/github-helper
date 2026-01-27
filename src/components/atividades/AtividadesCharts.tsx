import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
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
  ResponsiveContainer 
} from "recharts";
import { getActivityTypeLabel } from "@/hooks/useActivityLog";

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

interface AtividadesChartsProps {
  activities: ActivityWithUser[];
  period: string;
  customDateFrom?: Date;
  customDateTo?: Date;
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  lead_created: "hsl(156, 26%, 17%)",
  lead_updated: "hsl(85, 100%, 40%)",
  lead_deleted: "hsl(4, 74%, 57%)",
  lead_stage_changed: "hsl(43, 98%, 54%)",
  lead_viewed: "hsl(200, 70%, 50%)",
  lead_exported: "hsl(280, 60%, 50%)",
  lead_notes_added: "hsl(170, 50%, 45%)",
  lead_won: "hsl(120, 70%, 40%)",
  lead_lost: "hsl(0, 70%, 50%)",
  lead_contacted: "hsl(45, 90%, 50%)",
  user_login: "hsl(211, 70%, 58%)",
  user_logout: "hsl(200, 6%, 54%)",
  user_created: "hsl(276, 47%, 55%)",
  user_role_changed: "hsl(24, 100%, 63%)",
  config_updated: "hsl(184, 6%, 59%)",
  funnel_updated: "hsl(204, 70%, 53%)"
};

const USER_COLORS = [
  "hsl(156, 26%, 17%)",
  "hsl(85, 100%, 40%)",
  "hsl(43, 98%, 54%)",
  "hsl(276, 47%, 55%)",
  "hsl(211, 70%, 58%)"
];

export const AtividadesCharts = ({ activities, period, customDateFrom, customDateTo }: AtividadesChartsProps) => {
  // Timeline de atividades baseado no período
  const timelineData = useMemo(() => {
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
    
    const countByDate: Record<string, number> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at);
      const dateKey = format(date, "dd/MM");
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
    });

    const chartData = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = subDays(now, daysToShow - i - 1);
      const dateKey = format(date, "dd/MM");
      
      chartData.push({
        date: dateKey,
        count: countByDate[dateKey] || 0
      });
    }

    return chartData;
  }, [activities, period, customDateFrom, customDateTo]);

  // Distribuição por tipo de atividade
  const activityTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    
    activities.forEach(activity => {
      const type = activity.activity_type;
      types[type] = (types[type] || 0) + 1;
    });

    return Object.entries(types)
      .map(([type, count]) => ({ 
        type, 
        label: getActivityTypeLabel(type),
        count 
      }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  // Top usuários por atividade
  const topUsersData = useMemo(() => {
    const users: Record<string, { name: string; count: number }> = {};
    
    activities.forEach(activity => {
      if (!users[activity.user_id]) {
        users[activity.user_id] = { name: activity.user_name, count: 0 };
      }
      users[activity.user_id].count++;
    });

    return Object.values(users)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [activities]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Timeline de Atividades */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Timeline de Atividades</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Atividades registradas no período</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
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
                minTickGap={40}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                domain={[0, 'dataMax + 2']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#5bcc00" 
                strokeWidth={3}
                fill="url(#colorActivities)"
                name="Atividades"
                dot={{ fill: '#5bcc00', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por Tipo */}
      <Card className="col-span-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Por Tipo de Atividade</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Distribuição das atividades</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activityTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={120}
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
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar dataKey="count" name="Quantidade">
                {activityTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ACTIVITY_TYPE_COLORS[entry.type] || "hsl(204, 12%, 70%)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Usuários */}
      <Card className="col-span-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">Usuários Mais Ativos</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Top 5 por número de atividades</p>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={topUsersData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={5}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name.split(' ')[0]}: ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: 'hsl(var(--border))' }}
              >
                {topUsersData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={USER_COLORS[index % USER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                labelStyle={{ display: 'none' }}
                formatter={(value: number, name: string, props: any) => [`${props.payload.name}: ${value} atividades`, null]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
