import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useActivityLog } from "@/hooks/useActivityLog";

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    nome_completo: "",
    telefone: "",
    role: "user" as "user" | "admin" | "global",
  });

  const { logActivity } = useActivityLog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.nome_completo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      // Enviar convite via edge function
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: formData.email,
          nome_completo: formData.nome_completo,
          telefone: formData.telefone || undefined,
          role: formData.role,
        },
      });

      // Verificar erro retornado no body (quando status != 2xx, data pode conter o erro)
      if (data?.error) {
        throw new Error(data.error);
      }

      if (error) {
        // Tentar extrair mensagem de erro do contexto
        const errorMessage = error.message || "Erro ao enviar convite";
        throw new Error(errorMessage);
      }

      // Registrar atividade
      await logActivity(
        'user_created',
        `Convite enviado para: ${formData.nome_completo} (${formData.email})`,
        { 
          new_user_email: formData.email,
          role: formData.role 
        }
      );

      toast.success("Convite enviado com sucesso! O usuário receberá um email para definir a senha.");
      setOpen(false);
      setFormData({
        email: "",
        nome_completo: "",
        telefone: "",
        role: "user",
      });
      onUserCreated();
    } catch (error: any) {
      console.error("Erro ao enviar convite:", error);
      
      const errorMessage = error.message || "Erro desconhecido";
      
      if (errorMessage.includes("já está cadastrado") || errorMessage.includes("already been registered")) {
        toast.error("Este email já está cadastrado no sistema");
      } else if (errorMessage.includes("convite pendente")) {
        toast.error("Já existe um convite pendente para este email");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar Novo Usuário</DialogTitle>
          <DialogDescription>
            Um email será enviado para o usuário com o link de cadastro.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input
              id="nome_completo"
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="Nome do usuário"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Nível de Acesso</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Usuário</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Global Admin</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Convite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
