import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, Calendar, Shield, Key, Edit, Save, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";

const profileSchema = z.object({
  nome_completo: z.string()
    .trim()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  telefone: z.string()
    .trim()
    .min(10, "Telefone inválido")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^[\d\s\-\(\)\+]+$/, "Telefone deve conter apenas números e caracteres válidos")
    .optional()
    .or(z.literal("")),
});

const Perfil = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nome_completo: "",
    telefone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar perfil:", error);
      return;
    }

    setProfile(data);
    if (data) {
      setEditForm({
        nome_completo: data.nome_completo || "",
        telefone: data.telefone || "",
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleName = () => {
    switch (role) {
      case 'global': return 'Global Admin';
      case 'admin': return 'Admin da Empresa';
      case 'user': return 'Usuário';
      default: return 'Usuário';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    if (profile) {
      setEditForm({
        nome_completo: profile.nome_completo || "",
        telefone: profile.telefone || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Validação
      const validatedData = profileSchema.parse(editForm);
      setErrors({});

      setIsSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          nome_completo: validatedData.nome_completo,
          telefone: validatedData.telefone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);

      if (error) {
        toast.error("Erro ao salvar perfil: " + error.message);
        setIsSaving(false);
        return;
      }

      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
      fetchProfile();
      setIsSaving(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error("Por favor, corrija os erros no formulário");
      }
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
      return;
    }

    toast.success("Senha alterada com sucesso!");
    setIsEditingPassword(false);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
  };

  const getMemberSinceDate = () => {
    if (!profile?.created_at) return "Não informado";
    return new Date(profile.created_at).toLocaleDateString("pt-BR");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações da conta</p>
        </div>

        {/* Card Principal Centralizado */}
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              {/* Header com Avatar e Info Principal */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                      {profile?.nome_completo ? getInitials(profile.nome_completo) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {profile?.nome_completo || "Nome não informado"}
                    </h2>
                    <p className="text-muted-foreground">{user?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {getRoleName()}
                    </Badge>
                  </div>
                </div>
                {!isEditing ? (
                  <Button variant="outline" className="gap-2" onClick={handleEdit}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              {/* Informações Pessoais */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nome */}
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Nome
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            value={editForm.nome_completo}
                            onChange={(e) =>
                              setEditForm({ ...editForm, nome_completo: e.target.value })
                            }
                            placeholder="Digite seu nome completo"
                            className={errors.nome_completo ? "border-destructive" : ""}
                          />
                          {errors.nome_completo && (
                            <p className="text-xs text-destructive mt-1">
                              {errors.nome_completo}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-foreground font-medium">
                          {profile?.nome_completo || "Não informado"}
                        </p>
                      )}
                    </div>

                    {/* Email (não editável) */}
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <p className="text-foreground font-medium">{user?.email}</p>
                    </div>

                    {/* Telefone */}
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4" />
                        Telefone
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            value={editForm.telefone}
                            onChange={(e) =>
                              setEditForm({ ...editForm, telefone: e.target.value })
                            }
                            placeholder="(00) 00000-0000"
                            className={errors.telefone ? "border-destructive" : ""}
                          />
                          {errors.telefone && (
                            <p className="text-xs text-destructive mt-1">{errors.telefone}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-foreground font-medium">
                          {profile?.telefone || "Não informado"}
                        </p>
                      )}
                    </div>

                    {/* Empresa (fixo) */}
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4" />
                        Empresa
                      </Label>
                      <p className="text-foreground font-medium">Imaculada Agronegócios</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Informações da Conta */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Informações da Conta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        Nível de Acesso
                      </Label>
                      <Badge variant="secondary" className="font-semibold">
                        {getRoleName()}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        Membro desde
                      </Label>
                      <p className="text-foreground font-medium">{getMemberSinceDate()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Segurança */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Segurança
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Gerencie suas configurações de segurança
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Alterar Senha
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Última alteração: há 47 dias
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Força:</span>
                    <div className="flex gap-1">
                      <div className="h-2 w-8 bg-yellow-500 rounded-full" />
                      <div className="h-2 w-8 bg-yellow-500 rounded-full" />
                      <div className="h-2 w-8 bg-muted rounded-full" />
                    </div>
                    <span className="text-xs text-muted-foreground">Médio</span>
                  </div>
                </div>
                <Button onClick={() => setIsEditingPassword(true)}>Alterar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de Alteração de Senha */}
        <Dialog open={isEditingPassword} onOpenChange={setIsEditingPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  placeholder="Digite a nova senha"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  placeholder="Confirme a nova senha"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingPassword(false);
                    setPasswordForm({ newPassword: "", confirmPassword: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handlePasswordChange} disabled={isLoading}>
                  {isLoading ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Perfil;
