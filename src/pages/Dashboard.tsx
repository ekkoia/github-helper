import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard as DashboardHero } from "@/components/Dashboard";
import { DashboardSkeleton } from "@/components/SkeletonLoader";
import { DashboardCharts } from "@/components/DashboardCharts";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseVolume } from "@/lib/volumeParser";

const DashboardPage = () => {
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

  const volumeTotal = leads.reduce((sum, lead) => {
    const volume = parseVolume(lead.volume);
    return sum + volume;
  }, 0);

  if (isLoading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <DashboardHero
          totalLeads={totalLeads}
          leadsGanhos={leadsGanhos}
          taxaConversao={taxaConversao}
          volumeTotal={volumeTotal}
        />
        
        <DashboardCharts leads={leads} />
        
        <DashboardMetrics leads={leads} />
      </div>
    </Layout>
  );
};

export default DashboardPage;
