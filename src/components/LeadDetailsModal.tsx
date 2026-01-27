import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, User, Package, MapPin, Warehouse, Edit } from "lucide-react";

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome Completo</p>
                <p className="font-medium">{lead.nome_completo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Perfil</p>
                <Badge variant="outline">{lead.perfil}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {lead.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {lead.telefone}
                </p>
              </div>
              {lead.protocolo_atendimento && (
                <div>
                  <p className="text-sm text-muted-foreground">Protocolo</p>
                  <p className="font-mono">{lead.protocolo_atendimento}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Data de Criação</p>
                <p>{formatDate(lead.data_criacao)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Negociação */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Negociação
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {lead.intencao && (
                <div>
                  <p className="text-sm text-muted-foreground">Intenção</p>
                  <Badge className="bg-secondary">{lead.intencao}</Badge>
                </div>
              )}
              {lead.tipo_grao && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Grão</p>
                  <p className="font-medium">{lead.tipo_grao}</p>
                </div>
              )}
              {lead.volume && (
                <div>
                  <p className="text-sm text-muted-foreground">Volume</p>
                  <p className="font-medium">{lead.volume}</p>
                </div>
              )}
              {lead.valor_produto && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor/Produto</p>
                  <p className="font-medium">{formatCurrency(lead.valor_produto)}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Localização */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Localização
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {lead.cidade && (
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium">{lead.cidade}</p>
                </div>
              )}
              {lead.uf && (
                <div>
                  <p className="text-sm text-muted-foreground">UF</p>
                  <p className="font-medium">{lead.uf}</p>
                </div>
              )}
              {lead.localizacao_embarque && (
                <div>
                  <p className="text-sm text-muted-foreground">Localização Embarque</p>
                  <p>{lead.localizacao_embarque}</p>
                </div>
              )}
              {lead.distancia_km && (
                <div>
                  <p className="text-sm text-muted-foreground">Distância</p>
                  <p>{lead.distancia_km} km</p>
                </div>
              )}
              {lead.sentido && (
                <div>
                  <p className="text-sm text-muted-foreground">Sentido</p>
                  <p>{lead.sentido}</p>
                </div>
              )}
              {lead.estrada_terra_km && (
                <div>
                  <p className="text-sm text-muted-foreground">Estrada de Terra</p>
                  <p>{lead.estrada_terra_km} km</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dados Técnicos */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Dados Técnicos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {lead.armazenamento && (
                <div>
                  <p className="text-sm text-muted-foreground">Armazenamento</p>
                  <p className="font-medium">{lead.armazenamento}</p>
                </div>
              )}
              {lead.qualidade && (
                <div>
                  <p className="text-sm text-muted-foreground">Qualidade</p>
                  <p>{lead.qualidade}</p>
                </div>
              )}
              {lead.tem_royalties && (
                <div>
                  <p className="text-sm text-muted-foreground">Tem Royalties</p>
                  <p className="font-medium">{lead.tem_royalties}</p>
                </div>
              )}
              {lead.percentual_royalties && (
                <div>
                  <p className="text-sm text-muted-foreground">% Royalties</p>
                  <p className="font-medium">{lead.percentual_royalties}%</p>
                </div>
              )}
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
