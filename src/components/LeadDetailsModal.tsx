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
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, User, TrendingUp, Edit, UserPlus, Check, AlertTriangle, Layers, MessageSquare, Save, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { AssignLeadDialog } from "./AssignLeadDialog";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import { toast } from "sonner";

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
  const { logActivity } = useActivityLog();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [responsavelNome, setResponsavelNome] = useState<string | null>(null);
  const [currentLead, setCurrentLead] = useState(lead);
  const [concordaEmprestimo, setConcordaEmprestimo] = useState<string | null>(null);
  const [showOrigens, setShowOrigens] = useState(false);
  const [notaAssessor, setNotaAssessor] = useState("");
  const [isSavingNota, setIsSavingNota] = useState(false);
  const [notaDirty, setNotaDirty] = useState(false);

  // Verificar se é formulário 02
  const isFormulario02 = currentLead?.observacoes?.includes('02 - Formulário FeeAgro');

  // Atualizar currentLead quando lead mudar
  useEffect(() => {
    setCurrentLead(lead);
    setConcordaEmprestimo(null);
    setNotaAssessor((lead as any)?.nota_assessor || "");
    setNotaDirty(false);
  }, [lead]);

  // Buscar resposta de concordância para formulário 02
  useEffect(() => {
    const fetchConcordancia = async () => {
      if (!isFormulario02 || !currentLead?.email) {
        setConcordaEmprestimo(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('leadsNativo_feeagro')
          .select('"Você concorda que esse formulário não trata-se de empréstim"')
          .ilike('email', currentLead.email)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar concordância:", error);
          return;
        }

        const resposta = data?.["Você concorda que esse formulário não trata-se de empréstim"];
        setConcordaEmprestimo(resposta || null);
      } catch (error) {
        console.error("Erro ao buscar concordância:", error);
      }
    };

    fetchConcordancia();
  }, [isFormulario02, currentLead?.email]);

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

  const handleSaveNota = async () => {
    if (!currentLead?.id) return;
    setIsSavingNota(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ nota_assessor: notaAssessor || null } as any)
        .eq("id", currentLead.id);

      if (error) throw error;

      await logActivity(
        'lead_notes_added',
        `Adicionou nota do assessor ao lead "${currentLead.nome_completo}"`,
        { lead_id: currentLead.id, lead_nome: currentLead.nome_completo, tipo: 'nota_assessor' }
      );

      setCurrentLead({ ...currentLead, nota_assessor: notaAssessor });
      setNotaDirty(false);
      toast.success("Nota salva com sucesso!");
      onLeadUpdated?.();
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      toast.error("Erro ao salvar nota. Tente novamente.");
    } finally {
      setIsSavingNota(false);
    }
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
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">Origem</p>
                  {(() => {
                    const origens: string[] = Array.isArray(currentLead.origens) ? currentLead.origens : [];
                    const hasMultiple = origens.length > 1;

                    if (hasMultiple) {
                      return (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setShowOrigens(!showOrigens)}
                            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/70"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            {origens.length} canais diferentes
                          </button>
                          {showOrigens && (
                            <div className="flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              {origens.map((o: string, i: number) => (
                                <Badge key={i} variant="outline">
                                  {ORIGEM_LABELS[o] || o}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Badge variant="outline">
                        {ORIGEM_LABELS[origens[0] || currentLead.origem] || currentLead.origem || "-"}
                      </Badge>
                    );
                  })()}
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

            <Separator />

            {/* Nota do Assessor */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Nota do Assessor(a)
              </h3>
              <Textarea
                value={notaAssessor}
                onChange={(e) => {
                  setNotaAssessor(e.target.value);
                  setNotaDirty(true);
                }}
                rows={3}
                placeholder="Adicione sua nota ou feedback sobre este lead..."
                className="mb-2"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveNota}
                  disabled={isSavingNota || !notaDirty}
                  className="gap-2"
                >
                  {isSavingNota ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Nota
                </Button>
              </div>
            </div>

            {(currentLead.observacoes || isFormulario02) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Observações</h3>
                  
                  {/* Destaque para concordância de empréstimo - Formulário 02 */}
                  {isFormulario02 && concordaEmprestimo !== null && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      concordaEmprestimo?.toLowerCase() === 'sim' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                        : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                    }`}>
                      <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Entende que não é empréstimo?
                      </p>
                      <Badge 
                        className={`text-sm px-3 py-1 ${
                          concordaEmprestimo?.toLowerCase() === 'sim'
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                      >
                        {concordaEmprestimo?.toLowerCase() === 'sim' ? (
                          <><Check className="h-4 w-4 mr-1" /> Sim</>
                        ) : (
                          <><AlertTriangle className="h-4 w-4 mr-1" /> Não</>
                        )}
                      </Badge>
                    </div>
                  )}

                  {currentLead.observacoes && (
                    <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {currentLead.observacoes}
                    </p>
                  )}
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
