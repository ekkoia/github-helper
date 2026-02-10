import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Sliders, Plus, Users } from "lucide-react";
import { PreferenciasSection } from "@/components/configuracoes/PreferenciasSection";
import { FunilSection } from "@/components/configuracoes/FunilSection";
import { CamposCustomizadosSection } from "@/components/configuracoes/CamposCustomizadosSection";
import { DistribuicaoSection } from "@/components/configuracoes/DistribuicaoSection";
import { useUserRole } from "@/hooks/useUserRole";

const Configuracoes = () => {
  const { role } = useUserRole();
  const isAdmin = role === 'admin' || role === 'global';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e preferências pessoais
          </p>
        </div>

        <Tabs defaultValue="preferencias" className="space-y-6">
          <div className="max-w-3xl mx-auto">
            <TabsList>
              <TabsTrigger value="preferencias" className="gap-2">
                <Settings className="h-4 w-4" />
                Preferências
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="funil" className="gap-2">
                    <Sliders className="h-4 w-4" />
                    Funil
                  </TabsTrigger>
                  <TabsTrigger value="campos" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Campos Customizados
                  </TabsTrigger>
                  <TabsTrigger value="distribuicao" className="gap-2">
                    <Users className="h-4 w-4" />
                    Distribuição
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <TabsContent value="preferencias">
            <div className="max-w-3xl mx-auto">
              <PreferenciasSection />
            </div>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="funil">
                <div className="max-w-3xl mx-auto">
                  <FunilSection />
                </div>
              </TabsContent>

              <TabsContent value="campos">
                <div className="max-w-3xl mx-auto">
                  <CamposCustomizadosSection />
                </div>
              </TabsContent>

              <TabsContent value="distribuicao">
                <div className="max-w-5xl mx-auto">
                  <DistribuicaoSection />
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Configuracoes;
