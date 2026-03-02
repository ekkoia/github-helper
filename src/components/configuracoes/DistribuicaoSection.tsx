import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutoAssign } from "@/hooks/useAutoAssign";
import { useUsers } from "@/hooks/useUsers";
import { ArrowUp, ArrowDown, Trash2, UserPlus, Users } from "lucide-react";
import { useActivityLog } from "@/hooks/useActivityLog";

type Faixa = 'ate_10k' | 'acima_10k';

const FaixaQueue = ({
  faixa,
  title,
  description,
  entries,
  usersMap,
  availableUsers,
  onAdd,
  onRemove,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  faixa: Faixa;
  title: string;
  description: string;
  entries: { id: string; user_id: string; ordem: number; ativo: boolean }[];
  usersMap: Record<string, { user_id: string; nome_completo: string | null; email: string | null }>;
  availableUsers: { user_id: string; nome_completo: string | null; email: string | null }[];
  onAdd: (userId: string, faixa: Faixa) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onToggle: (id: string, ativo: boolean) => Promise<boolean>;
  onMoveUp: (faixa: Faixa, index: number) => void;
  onMoveDown: (faixa: Faixa, index: number) => void;
}) => {
  const [selectedUser, setSelectedUser] = useState<string>("");

  const handleAdd = async () => {
    if (!selectedUser) return;
    const ok = await onAdd(selectedUser, faixa);
    if (ok) setSelectedUser("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add user */}
        <div className="flex gap-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.nome_completo || u.email || u.user_id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!selectedUser} size="sm" className="gap-1">
            <UserPlus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Queue list */}
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum usuário configurado nesta fila. Leads desta faixa não serão atribuídos automaticamente.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const user = usersMap[entry.user_id];
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs w-7 justify-center">
                      {index + 1}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {user?.nome_completo || user?.email || entry.user_id.slice(0, 8)}
                      </p>
                      {user?.email && user?.nome_completo && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                    {!entry.ativo && (
                      <Badge variant="secondary" className="text-xs">Pausado</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={entry.ativo}
                      onCheckedChange={(checked) => onToggle(entry.id, checked)}
                      aria-label="Ativar/desativar"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => onMoveUp(faixa, index)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === entries.length - 1}
                      onClick={() => onMoveDown(faixa, index)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemove(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DistribuicaoSection = () => {
  const { config, getByFaixa, addUser, removeUser, toggleUser, reorderUsers, loading } = useAutoAssign();
  const { users, usersMap, loading: usersLoading } = useUsers();
  const { logActivity } = useActivityLog();

  const ate10k = getByFaixa('ate_10k');
  const acima10k = getByFaixa('acima_10k');

  const faixaLabel = (f: Faixa) => f === 'ate_10k' ? 'Até R$10 mil' : 'Acima de R$10 mil';
  const userName = (userId: string) => usersMap[userId]?.nome_completo || usersMap[userId]?.email || userId.slice(0, 8);

  const getAvailableUsers = (faixa: Faixa) => {
    const assignedUserIds = (faixa === 'ate_10k' ? ate10k : acima10k).map(e => e.user_id);
    return users.filter(u => !assignedUserIds.includes(u.user_id));
  };

  const handleAdd = useCallback(async (userId: string, faixa: Faixa) => {
    const ok = await addUser(userId, faixa);
    if (ok) {
      logActivity('config_updated', `Adicionou ${userName(userId)} na fila ${faixaLabel(faixa)}`, {
        action: 'add', target_user_id: userId, faixa
      });
    }
    return ok;
  }, [addUser, logActivity, usersMap]);

  const handleRemove = useCallback(async (id: string) => {
    const entry = config.find(c => c.id === id);
    const ok = await removeUser(id);
    if (ok && entry) {
      logActivity('config_updated', `Removeu ${userName(entry.user_id)} da fila ${faixaLabel(entry.faixa as Faixa)}`, {
        action: 'remove', target_user_id: entry.user_id, faixa: entry.faixa
      });
    }
    return ok;
  }, [removeUser, logActivity, config, usersMap]);

  const handleToggle = useCallback(async (id: string, ativo: boolean) => {
    const entry = config.find(c => c.id === id);
    const ok = await toggleUser(id, ativo);
    if (ok && entry) {
      logActivity('config_updated', `${ativo ? 'Ativou' : 'Pausou'} ${userName(entry.user_id)} na fila ${faixaLabel(entry.faixa as Faixa)}`, {
        action: 'toggle', target_user_id: entry.user_id, faixa: entry.faixa, ativo
      });
    }
    return ok;
  }, [toggleUser, logActivity, config, usersMap]);

  const handleMove = async (faixa: Faixa, fromIndex: number, toIndex: number) => {
    const entries = faixa === 'ate_10k' ? [...ate10k] : [...acima10k];
    const [moved] = entries.splice(fromIndex, 1);
    entries.splice(toIndex, 0, moved);
    const ok = await reorderUsers(faixa, entries.map(e => e.id));
    if (ok) {
      logActivity('config_updated', `Reordenou fila ${faixaLabel(faixa)}`, {
        action: 'reorder', faixa
      });
    }
  };

  if (loading || usersLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Distribuição Automática de Leads</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure quais usuários recebem leads automaticamente por faixa de investimento. 
          A distribuição usa round-robin (rodízio) para garantir igualdade.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FaixaQueue
          faixa="ate_10k"
          title="Até R$10 mil"
          description="Leads com investimento de até R$10.000"
          entries={ate10k}
          usersMap={usersMap}
          availableUsers={getAvailableUsers('ate_10k')}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onToggle={handleToggle}
          onMoveUp={(faixa, i) => handleMove(faixa, i, i - 1)}
          onMoveDown={(faixa, i) => handleMove(faixa, i, i + 1)}
        />
        <FaixaQueue
          faixa="acima_10k"
          title="Acima de R$10 mil"
          description="Leads com investimento acima de R$10.000"
          entries={acima10k}
          usersMap={usersMap}
          availableUsers={getAvailableUsers('acima_10k')}
          onAdd={addUser}
          onRemove={removeUser}
          onToggle={toggleUser}
          onMoveUp={(faixa, i) => handleMove(faixa, i, i - 1)}
          onMoveDown={(faixa, i) => handleMove(faixa, i, i + 1)}
        />
      </div>
    </div>
  );
};
