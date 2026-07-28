import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useLeadTagsCatalog } from "@/hooks/useLeadTags";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadIds: string[];
  onDone: () => void;
}

export const BulkAddTagDialog: React.FC<Props> = ({ open, onOpenChange, leadIds, onDone }) => {
  const { tags } = useLeadTagsCatalog();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const reset = () => setSelected(new Set());

  const handleSave = async () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos uma tag");
      return;
    }
    setSaving(true);
    try {
      const rows: any[] = [];
      for (const leadId of leadIds) {
        for (const tagId of selected) {
          rows.push({ lead_id: leadId, tag_id: tagId, atribuido_por: user?.id ?? null });
        }
      }
      // Chunk to avoid oversized payloads
      const chunks: any[][] = [];
      for (let i = 0; i < rows.length; i += 500) chunks.push(rows.slice(i, i + 500));

      for (const chunk of chunks) {
        const { error } = await supabase
          .from("lead_tag_assignments" as any)
          .upsert(chunk, { onConflict: "lead_id,tag_id", ignoreDuplicates: true });
        if (error) throw error;
      }

      toast.success(
        `${selected.size} tag(s) aplicada(s) em ${leadIds.length} lead${leadIds.length !== 1 ? "s" : ""}`
      );
      reset();
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao aplicar tags");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Adicionar tag em {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-64 rounded-md border border-border p-2">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2">Nenhuma tag cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {tags.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded hover:bg-muted/50"
                >
                  <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
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
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || selected.size === 0}>
            {saving ? "Aplicando..." : `Aplicar ${selected.size > 0 ? `(${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAddTagDialog;
