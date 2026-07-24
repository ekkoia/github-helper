import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeadTagsCatalog } from "@/hooks/useLeadTags";
import { useUsers } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useUserRole";
import type { ConversationFilters } from "@/hooks/useConversationFilters";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: ConversationFilters;
  onApply: (next: ConversationFilters) => void;
}

const ConversationFiltersDialog: React.FC<Props> = ({ open, onOpenChange, value, onApply }) => {
  const { tags } = useLeadTagsCatalog();
  const { users } = useUsers();
  const { isAdmin } = useUserRole();
  const [draft, setDraft] = React.useState<ConversationFilters>(value);

  React.useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filtrar conversas</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tags */}
          <div>
            <Label className="text-sm font-semibold">Tags</Label>
            <ScrollArea className="mt-2 h-40 rounded-md border border-border p-2">
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tag cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {tags.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={draft.tagIds.includes(t.id)}
                        onCheckedChange={() =>
                          setDraft({ ...draft, tagIds: toggle(draft.tagIds, t.id) })
                        }
                      />
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: t.cor, color: "#fff" }}
                      >
                        {t.emoji && <span>{t.emoji}</span>}
                        {t.nome}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Não iniciadas */}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm font-semibold">Não iniciadas pelo assessor</Label>
              <p className="text-xs text-muted-foreground">
                Leads atribuídos onde o assessor ainda não enviou nenhuma mensagem.
              </p>
            </div>
            <Switch
              checked={draft.onlyNotStartedByAssessor}
              onCheckedChange={(v) =>
                setDraft({ ...draft, onlyNotStartedByAssessor: v })
              }
            />
          </div>

          {/* Assessores (admin) */}
          {isAdmin && (
            <div>
              <Label className="text-sm font-semibold">Assessores</Label>
              <ScrollArea className="mt-2 h-40 rounded-md border border-border p-2">
                {users.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum assessor.</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <label
                        key={u.user_id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={draft.assessorIds.includes(u.user_id)}
                          onCheckedChange={() =>
                            setDraft({
                              ...draft,
                              assessorIds: toggle(draft.assessorIds, u.user_id),
                            })
                          }
                        />
                        <span className="truncate">{u.nome_completo || u.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              setDraft({ tagIds: [], assessorIds: [], onlyNotStartedByAssessor: false })
            }
          >
            Limpar
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationFiltersDialog;
