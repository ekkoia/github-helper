import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";

interface UserData {
  id: string;
  email: string;
  nome_completo: string;
  role: "user" | "admin" | "global";
  role_id: string;
}

interface EditUserDialogProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  canEditRole: boolean;
}

export const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onUserUpdated,
  canEditRole,
}: EditUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: "",
    role: "user" as "user" | "admin" | "global",
  });

  const { logActivity } = useActivityLog();

  useEffect(() => {
    if (user) {
      setFormData({
        nome_completo: user.nome_completo,
        role: user.role,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!formData.nome_completo.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      // Atualizar nome no perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ nome_completo: formData.nome_completo })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Atualizar role se permitido e se mudou
      if (canEditRole && formData.role !== user.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: formData.role })
          .eq("id", user.role_id);

        if (roleError) throw roleError;
      }

      // Registrar atividade
      await logActivity(
        "config_updated",
        `Usuário atualizado: ${formData.nome_completo}`,
        {
          user_id: user.id,
          changes: {
            nome_completo: formData.nome_completo,
            role: canEditRole ? formData.role : undefined,
          },
        }
      );

      toast.success("Usuário atualizado com sucesso!");
      onOpenChange(false);
      onUserUpdated();
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "global":
        return "Global Admin";
      case "admin":
        return "Administrador";
      default:
        return "Usuário";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do usuário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome completo</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) =>
                setFormData({ ...formData, nome_completo: e.target.value })
              }
              placeholder="Nome do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Perfil</Label>
            {canEditRole ? (
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="global">Global Admin</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={getRoleLabel(user?.role || "user")}
                disabled
                className="bg-muted"
              />
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
