import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";
import { useUsers } from "@/hooks/useUsers";
import { Navigate } from "react-router-dom";
import { fetchAllLeads } from "@/lib/supabaseUtils";
import { EquipeMetrics } from "@/components/equipe/EquipeMetrics";
import { EquipeTable } from "@/components/equipe/EquipeTable";
import { EquipeCharts } from "@/components/equipe/EquipeCharts";
import { EquipeExport } from "@/components/equipe/EquipeExport";
import { Skeleton } from "@/components/ui/skeleton";

const Equipe = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { users, usersMap, loading: usersLoading } = useUsers();
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    setLeadsLoading(true);
    fetchAllLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLeadsLoading(false));
  }, [isAdmin]);

  if (roleLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const loading = usersLoading || leadsLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Equipe</h1>
            <p className="text-muted-foreground">
              Visão consolidada da operação comercial
            </p>
          </div>
          {!loading && <EquipeExport leads={leads} usersMap={usersMap} />}
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[380px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <EquipeMetrics leads={leads} usersMap={usersMap} />
            <EquipeTable leads={leads} usersMap={usersMap} />
            <EquipeCharts leads={leads} usersMap={usersMap} />
          </>
        )}
      </div>
    </Layout>
  );
};

export default Equipe;
