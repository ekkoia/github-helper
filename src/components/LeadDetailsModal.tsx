import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, User, TrendingUp, Edit, UserPlus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { AssignLeadDialog } from "./AssignLeadDialog";
import { supabase } from "@/integrations/supabase/client";

const ORIGEM_LABELS: Record<string, string> = {
  instagram_ads: "Instagram Ads",
  facebook_ads: "Facebook Ads",
  whatsapp: "WhatsApp",
  formulario_meta: "Formulário Nativo Meta",
  campanha_mensagem: "Campanha de Mensagem",
  indicacao: "Indicação",
  site: "Site/Landing Page",
  outro: "Outro",
};

interface LeadDetailsModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLeadUpdated?: () => void;
}

export const LeadDetailsModal = ({ lead, isOpen, onClose, onEdit, onLeadUpdated }: LeadDetailsModalProps) => {
  const { isAdmin } = useUserRole();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState(lead);

  // Atualizar currentLead quando lead mudar
  useEffect(() => {
    setCurrentLead(lead);
  }, [lead]);

  // Buscar nome do responsável
  useEffect(() => {
    const fetchResponsavel = async () => {
      if (!currentLead?.responsavel_id) {
        setResponsavelNome(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("nome_completo, email")
          .eq("user_id", currentLead.responsavel_id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar responsável:", error);
          return;
        }

        setResponsavelNome(data?.nome_completo || data?.email || "Usuário");
      } catch (error) {
        console.error("Erro ao buscar responsável:", error);
      }
    };

    fetchResponsavel();
  }, [currentLead?.responsavel_id]);

  if (!currentLead) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAssignSuccess = async () => {
    // Recarregar os dados do lead
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", currentLead.id)
      .single();
    
    if (data) {
      setCurrentLead(data);
    }
    
    onLeadUpdated?.();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Lead</span>
              <Button size="sm" onClick={onEdit} className="bg-gradient-primary">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Identificação */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Identificação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome Completo</p>
                  <p className="font-medium">{currentLead.nome_completo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {currentLead.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {currentLead.telefone || "-"}
                  </p>
                </div>
                {currentLead.protocolo_atendimento && (
                  <div>
                    <p className="text-sm text-muted-foreground">Protocolo</p>
                    <p className="font-mono">{currentLead.protocolo_atendimento}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Responsável - Seção para atribuição */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Responsável
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atribuído a</p>
                  <p className="font-medium">
                    {responsavelNome || (
                      <span className="text-muted-foreground italic">Não atribuído</span>
                    )}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAssignDialogOpen(true)}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {currentLead.responsavel_id ? "Alterar" : "Atribuir"}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Negociação */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Negociação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Qtd Cotas</p>
                  <p className="font-medium">{currentLead.volume || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Investido</p>
                  <p className="font-medium">
                    {currentLead.valor_produto ? formatCurrency(currentLead.valor_produto) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Investimento Real</p>
                  <p className="font-medium">
                    {currentLead.investimento_real ? formatCurrency(currentLead.investimento_real) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <Badge variant="outline">
                    {ORIGEM_LABELS[currentLead.origem] || currentLead.origem || "-"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Etapa do Funil</p>
                  <Badge className="bg-primary text-primary-foreground">
                    {currentLead.etapa_funil || "-"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data de Criação</p>
                  <p>{formatDate(currentLead.data_criacao)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última Atualização</p>
                  <p>{formatDate(currentLead.data_atualizacao)}</p>
                </div>
              </div>
            </div>

            {currentLead.observacoes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3">Observações</h3>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {currentLead.observacoes}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de atribuição */}
      <AssignLeadDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        lead={currentLead}
        onSuccess={handleAssignSuccess}
      />
    </>
  );
};
