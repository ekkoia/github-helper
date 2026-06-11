import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { EditUserDialog } from "@/components/EditUserDialog";
import { useActivityLog } from "@/hooks/useActivityLog";

interface UserWithRole {
  id: string;
  email: string;
  nome_completo: string;
  telefone: string | null;
  created_at: string;
  role: 'user' | 'admin' | 'global';
  role_id: string;
  status: 'active' | 'pending';
}

const Usuarios = () => {
  const { role, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState<string>("");
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { logActivity } = useActivityLog();

  const canAccess = role === 'admin' || role === 'global';
  const isGlobalAdmin = role === 'global';

  useEffect(() => {
    if (!roleLoading && canAccess) {
      fetchUsers();
    }
  }, [roleLoading, canAccess]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // Fetch active users from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch pending invites
      const { data: pendingInvites, error: pendingError } = await supabase
        .from("pending_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (pendingError) {
        console.error("Erro ao buscar convites pendentes:", pendingError);
      }

      // Map active users
      const activeUsers: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);

        return {
          id: profile.user_id,
          email: profile.email || "Email não disponível",
          nome_completo: profile.nome_completo,
          telefone: profile.telefone,
          created_at: profile.created_at,
          role: userRole?.role || 'user',
          role_id: userRole?.id || '',
          status: 'active' as const,
        };
      });

      // Filtrar pending invites que já têm profile ativo (proteção contra duplicatas)
      const activeEmails = new Set(profiles.map(p => p.email?.toLowerCase()).filter(Boolean));
      const filteredPendingInvites = (pendingInvites || [])
        .filter(invite => !activeEmails.has(invite.email?.toLowerCase()));

      // Map pending invites
      const pendingUsers: UserWithRole[] = filteredPendingInvites.map(invite => ({
        id: invite.id,
        email: invite.email,
        nome_completo: invite.nome_completo,
        telefone: invite.telefone,
        created_at: invite.created_at,
        role: (invite.role as 'user' | 'admin' | 'global') || 'user',
        role_id: '',
        status: 'pending' as const,
      }));

      // Combine and sort by created_at
      const allUsers = [...pendingUsers, ...activeUsers];
      setUsers(allUsers);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string, newRole: 'user' | 'admin' | 'global') => {
    try {
      if (!roleId) {
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", roleId);

        if (error) throw error;
      }

      const user = users.find(u => u.id === userId);
      await logActivity(
        'user_role_changed',
        `Permissão alterada para ${user?.nome_completo || 'usuário'}: ${getRoleLabel(newRole)}`,
        { target_user_id: userId, new_role: newRole }
      );

      toast.success("Nível de acesso atualizado!");
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao atualizar role:", error);
      toast.error("Erro ao atualizar nível de acesso");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const userToDelete = users.find(u => u.id === deleteUserId);
      
      if (userToDelete?.status === 'pending') {
        // Excluir da tabela pending_invites
        const { error: pendingError } = await supabase
          .from("pending_invites")
          .delete()
          .eq("id", deleteUserId);

        if (pendingError) throw pendingError;
        
        // Também tentar deletar do auth.users via edge function
        // (usuários convidados já existem no auth.users mesmo antes de completar o cadastro)
        // Buscar o email do convite para encontrar o user_id correto
        const { data: deleteData, error: deleteError } = await supabase.functions.invoke('delete-user-by-email', {
          body: { email: userToDelete.email }
        });
        
        // Ignorar erro se o usuário não existir no auth.users
        if (deleteError && !deleteError.message?.includes("not found")) {
          console.error("Erro ao deletar usuário do auth:", deleteError);
        }
      } else {
        // Chamar edge function para excluir usuário completamente do auth.users
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId: deleteUserId }
        });

        // Mesmo com erro HTTP, o body costuma vir em data ou em error.context
        if (error) {
          let serverMsg = error.message;
          try {
            const ctx: any = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              if (body?.error) serverMsg = body.error;
            } else if (data?.error) {
              serverMsg = data.error;
            }
          } catch {}
          throw new Error(serverMsg);
        }

        if (data?.error) {
          throw new Error(data.error);
        }
      }

      await logActivity(
        'user_deleted' as any,
        `Removeu o usuário "${deleteUserName}"`,
        { target_user_id: deleteUserId, user_name: deleteUserName }
      );

      toast.success("Usuário removido com sucesso!");
      setDeleteUserId(null);
      setDeleteUserName("");
      fetchUsers();
    } catch (error: any) {
      console.error("Erro ao remover usuário:", error);
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'global':
        return 'Global Admin';
      case 'admin':
        return 'Administrador';
      default:
        return 'Usuário';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'global':
        return 'bg-primary text-primary-foreground';
      case 'admin':
        return 'bg-secondary text-secondary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (roleLoading) {
    return null;
  }

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Usuários da Empresa</h1>
          <p className="text-muted-foreground">Gerencie os usuários da sua empresa</p>
        </div>

        {/* Card de Usuários */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Usuários Cadastrados</CardTitle>
              <CardDescription>Lista de todos os usuários da empresa</CardDescription>
            </div>
            {canAccess && <CreateUserDialog onUserCreated={fetchUsers} />}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate max-w-[200px]">{user.nome_completo}</span>
                        <Badge 
                          variant="outline" 
                          className={user.status === 'active' 
                            ? "bg-status-ganho/10 text-status-ganho border-status-ganho/30"
                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                          }
                        >
                          {user.status === 'active' ? 'Ativo' : 'Pendente'}
                        </Badge>
                        <Badge className={getRoleBadgeClass(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
                      {/* Select de Role - apenas para global admin */}
                      {isGlobalAdmin && (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, user.role_id, value as any)}
                        >
                          <SelectTrigger className="w-[120px] md:w-[140px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="global">Global Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Botão Editar */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditingUser(user);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Botão Excluir */}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setDeleteUserId(user.id);
                          setDeleteUserName(user.nome_completo);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de edição de usuário */}
        <EditUserDialog
          user={editingUser}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onUserUpdated={fetchUsers}
          canEditRole={canAccess}
        />

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o usuário "{deleteUserName}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Usuarios;
