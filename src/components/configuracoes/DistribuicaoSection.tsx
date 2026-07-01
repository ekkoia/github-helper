import { useState } from "react";
import { useRodizio } from "@/hooks/useRodizio";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export const DistribuicaoSection = () => {
  const { config, loading, addUser, removeUser, toggleUser, moveUp, moveDown } = useRodizio();
  const { users } = useUsers();
  const [selectedUser, setSelectedUser] = useState("");
  const [adding, setAdding] = useState(false);

  const usersNoRodizio = new Set(config.map(c => c.user_id));
  const availableUsers = users.filter(u => !usersNoRodizio.has(u.user_id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    setAdding(true);
    const ok = await addUser(selectedUser);
    if (ok) {
      toast.success("Assessor adicionado ao rodízio");
      setSelectedUser("");
    }
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Rodízio de Leads</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure quais assessores recebem leads automaticamente. Os leads são distribuídos
          em rodízio (sequencial) entre os assessores ativos nesta lista.
        </p>
      </div>

      {/* Adicionar assessor */}
      <div className="flex gap-3">
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione um assessor para adicionar..." />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <SelectItem value="__none__" disabled>Todos os assessores já estão no rodízio</SelectItem>
            ) : (
              availableUsers.map(u => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.nome_completo || u.email}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={!selectedUser || adding} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {/* Lista do rodízio */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
        </div>
      ) : config.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 text-muted-foreground">
          <Users className="h-8 w-8 opacity-30" />
          <p className="text-sm">Nenhum assessor no rodízio ainda.</p>
          <p className="text-xs">Adicione assessores acima para começar a distribuir leads.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b border-border grid grid-cols-12 text-xs font-medium text-muted-foreground">
            <span className="col-span-1">#</span>
            <span className="col-span-6">Assessor</span>
            <span className="col-span-2 text-center">Ativo</span>
            <span className="col-span-3 text-right">Ações</span>
          </div>
          {config.map((row, index) => (
            <div
              key={row.id}
              className={`px-4 py-3 grid grid-cols-12 items-center border-b border-border last:border-0 ${
                !row.ativo ? "opacity-50" : ""
              }`}
            >
              <span className="col-span-1 text-sm text-muted-foreground font-mono">{index + 1}</span>
              <div className="col-span-6">
                <p className="text-sm font-medium text-foreground">{row.nome_completo || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{row.email}</p>
              </div>
              <div className="col-span-2 flex justify-center">
                <Switch
                  checked={row.ativo}
                  onCheckedChange={(v) => toggleUser(row.id, v)}
                />
              </div>
              <div className="col-span-3 flex justify-end gap-1">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => moveDown(index)}
                  disabled={index === config.length - 1}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={async () => {
                    await removeUser(row.id);
                    toast.success("Assessor removido do rodízio");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted/20 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Como funciona o rodízio</p>
        <p>• Os leads são atribuídos sequencialmente aos assessores ativos, na ordem definida acima.</p>
        <p>• Assessores com o toggle <strong>desativado</strong> são pulados no rodízio mas continuam na lista.</p>
        <p>• Use as setas para reordenar a sequência do rodízio.</p>
        <p>• Apenas assessores nesta lista recebem leads automaticamente.</p>
      </div>
    </div>
  );
};
