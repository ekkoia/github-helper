import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { LayoutGrid, Table } from "lucide-react";

import LeadsTable from "./LeadsTable";
import Kanban from "./Kanban";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const Leads = () => {
  const { preferences } = useUserPreferences();
  const [activeTab, setActiveTab] = useState("tabela");
  const hasAppliedPreference = useRef(false);

  // Aplicar visualização padrão apenas na primeira carga
  useEffect(() => {
    if (!hasAppliedPreference.current && preferences?.default_view) {
      setActiveTab(preferences.default_view);
      hasAppliedPreference.current = true;
    }
  }, [preferences]);

  return (
    <Layout>
      <div className="w-full max-w-[1400px] mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary">
              <TabsTrigger value="tabela" className="gap-2">
                <Table className="h-4 w-4" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tabela" className="m-0">
            <LeadsTable />
          </TabsContent>

          <TabsContent value="kanban" className="m-0">
            <Kanban />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leads;
