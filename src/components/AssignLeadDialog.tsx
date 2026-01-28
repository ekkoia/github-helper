import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Loader2, UserPlus } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  nome_completo: string | null;
  email: string | null;
}

interface AssignLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    nome_completo: string;
    responsavel_id: string | null;
  } | null;
  onSuccess: () => void;
}

export const AssignLeadDialog = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: AssignLeadDialogProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { createNotification } = useNotifications();
  const { logActivity } = useActivityLog();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Pré-selecionar o responsável atual se existir
      if (lead?.responsavel_id) {
        setSelectedUserId(lead.responsavel_id);
      } else {
        setSelectedUserId("");
      }
    }
  }, [isOpen, lead]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nome_completo, email")
        .order("nome_completo", { ascending: true });

      if (error) {
        console.error("Erro ao buscar usuários:", error);
        toast.error("Erro ao carregar lista de usuários");
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (!lead || !selectedUserId) {
      toast.error("Selecione um usuário");
      return;
    }

    setLoading(true);
    try {
      // Atualizar o lead com o novo responsável
      const { error: updateError } = await supabase
        .from("leads")
        .update({ responsavel_id: selectedUserId })
        .eq("id", lead.id);

      if (updateError) {
        console.error("Erro ao atribuir lead:", updateError);
        toast.error("Erro ao atribuir lead");
        return;
      }

      // Buscar nome do usuário selecionado
      const selectedUser = users.find((u) => u.user_id === selectedUserId);
      const userName = selectedUser?.nome_completo || selectedUser?.email || "Usuário";

      // Criar notificação para o usuário atribuído
      try {
        await createNotification(
          selectedUserId,
          "Lead atribuído a você",
          `O lead "${lead.nome_completo}" foi atribuído a você.`,
          "lead_assigned",
          { lead_id: lead.id, lead_nome: lead.nome_completo }
        );
      } catch (notifError) {
        // Não bloquear o fluxo se a notificação falhar
        console.error("Erro ao criar notificação:", notifError);
      }

      // Registrar atividade
      await logActivity(
        "lead_stage_changed",
        `Atribuiu o lead "${lead.nome_completo}" para ${userName}`,
        {
          lead_id: lead.id,
          lead_nome: lead.nome_completo,
          responsavel_id: selectedUserId,
          responsavel_nome: userName,
        }
      );

      toast.success(`Lead atribuído para ${userName}`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atribuir lead:", error);
      toast.error("Erro ao atribuir lead");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!lead) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ responsavel_id: null })
        .eq("id", lead.id);

      if (error) {
        console.error("Erro ao remover atribuição:", error);
        toast.error("Erro ao remover atribuição");
        return;
      }

      await logActivity(
        "lead_stage_changed",
        `Removeu a atribuição do lead "${lead.nome_completo}"`,
        { lead_id: lead.id, lead_nome: lead.nome_completo }
      );

      toast.success("Atribuição removida");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao remover atribuição:", error);
      toast.error("Erro ao remover atribuição");
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Atribuir Lead
          </DialogTitle>
          <DialogDescription>
            Selecione um usuário para ser responsável pelo lead "{lead.nome_completo}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Responsável</Label>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="user-select">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.nome_completo || user.email || "Usuário sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {lead.responsavel_id && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveAssignment}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Remover Atribuição
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAssign}
              disabled={loading || !selectedUserId}
              className="flex-1 sm:flex-none"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atribuir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
