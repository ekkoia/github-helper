import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { History, Megaphone } from "lucide-react";
import { CampanhaBuilder } from "@/components/campanhas/CampanhaBuilder";
import { CampanhasHistory } from "@/components/campanhas/CampanhasHistory";
import { useCampanhas } from "@/hooks/useCampanhas";

const Campanhas = () => {
  const { campanhas, loading, refetch } = useCampanhas();

  return (
    <Layout>
      <div className="w-full max-w-[1400px] mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-sm text-muted-foreground">
            Disparos em massa por template, sem atribuir leads. Conversas ativas
            (janela de 24h aberta) são bloqueadas automaticamente.
          </p>
        </div>

        <Tabs defaultValue="nova" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="nova" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Nova campanha
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nova" className="m-0">
            <CampanhaBuilder onCampanhaCriada={refetch} />
          </TabsContent>

          <TabsContent value="historico" className="m-0">
            <CampanhasHistory campanhas={campanhas} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Campanhas;
