import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadIds: string[];
  onDone: () => void;
}

export const BulkAddNoteDialog: React.FC<Props> = ({ open, onOpenChange, leadIds, onDone }) => {
  const [note, setNote] = useState("");
  const [replace, setReplace] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setNote("");
    setReplace(false);
  };

  const handleSave = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error("Digite uma nota antes de salvar");
      return;
    }
    setSaving(true);
    try {
      if (replace) {
        const { error } = await supabase
          .from("leads")
          .update({ nota_assessor: trimmed })
          .in("id", leadIds);
        if (error) throw error;
      } else {
        const { data: current, error: selErr } = await supabase
          .from("leads")
          .select("id, nota_assessor")
          .in("id", leadIds);
        if (selErr) throw selErr;

        const chunks: any[][] = [];
        const rows = current || [];
        for (let i = 0; i < rows.length; i += 50) chunks.push(rows.slice(i, i + 50));

        for (const chunk of chunks) {
          await Promise.all(
            chunk.map((r: any) => {
              const prev = (r.nota_assessor || "").trim();
              const next = prev ? `${prev}\n${trimmed}` : trimmed;
              return supabase.from("leads").update({ nota_assessor: next }).eq("id", r.id);
            })
          );
        }
      }
      toast.success(`Nota adicionada em ${leadIds.length} lead${leadIds.length !== 1 ? "s" : ""}`);
      reset();
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao adicionar nota");
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
            Adicionar nota em {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: Leads do assessor João para retomada..."
            rows={5}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
            <Label className="cursor-pointer">Substituir nota existente (padrão: anexar)</Label>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Adicionar nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAddNoteDialog;
