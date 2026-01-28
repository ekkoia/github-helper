import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, User, TrendingUp, Edit } from "lucide-react";

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
}

export const LeadDetailsModal = ({ lead, isOpen, onClose, onEdit }: LeadDetailsModalProps) => {
  if (!lead) return null;

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

  return (
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
                <p className="font-medium">{lead.nome_completo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {lead.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {lead.telefone || "-"}
                </p>
              </div>
              {lead.protocolo_atendimento && (
                <div>
                  <p className="text-sm text-muted-foreground">Protocolo</p>
                  <p className="font-mono">{lead.protocolo_atendimento}</p>
                </div>
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
                <p className="font-medium">{lead.volume || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Investido</p>
                <p className="font-medium">
                  {lead.valor_produto ? formatCurrency(lead.valor_produto) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimento Real</p>
                <p className="font-medium">
                  {lead.investimento_real ? formatCurrency(lead.investimento_real) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                <Badge variant="outline">
                  {ORIGEM_LABELS[lead.origem] || lead.origem || "-"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Etapa do Funil</p>
                <Badge className="bg-primary text-primary-foreground">
                  {lead.etapa_funil || "-"}
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
                <p>{formatDate(lead.data_criacao)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p>{formatDate(lead.data_atualizacao)}</p>
              </div>
            </div>
          </div>

          {lead.observacoes && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Observações</h3>
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                  {lead.observacoes}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
