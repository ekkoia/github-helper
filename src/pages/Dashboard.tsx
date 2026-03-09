import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard as DashboardHero } from "@/components/Dashboard";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { toast } from "sonner";
import { getTopoDaFaixa } from "@/lib/investmentUtils";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { useUserRole } from "@/hooks/useUserRole";

const DashboardPage = () => {
  const { isAdmin, loading: loadingRole } = useUserRole();
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("data_criacao", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar leads:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  // Cálculo das métricas principais
  const totalLeads = leads.length;
  
  const leadsGanhos = leads.filter(
    (lead) =>
      lead.etapa_funil === "Ganho" &&
      new Date(lead.data_criacao).getMonth() === new Date().getMonth()
  ).length;

  const taxaConversao =
    totalLeads > 0 ? (leadsGanhos / totalLeads) * 100 : 0;

  const valorTotalInvestido = leads.reduce((sum, lead) => {
    const valor = parseFloat(lead.valor_produto) || 0;
    return sum + getTopoDaFaixa(valor);
  }, 0);

  if (isLoading || loadingRole) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-[1400px] mx-auto px-4">
        <div className="space-y-8">
          {!isAdmin && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                📊 Exibindo métricas dos leads atribuídos a você
              </p>
            </div>
          )}
          
          <DashboardHero
            totalLeads={totalLeads}
            leadsGanhos={leadsGanhos}
            taxaConversao={taxaConversao}
            volumeTotal={valorTotalInvestido}
          />
        
          <DashboardCharts leads={leads} />
        
          <DashboardMetrics leads={leads} />
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
