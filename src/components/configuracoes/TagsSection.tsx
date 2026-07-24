import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLeadTagsCatalog, type LeadTag } from "@/hooks/useLeadTags";
import { TagChip } from "@/components/leads/LeadTagsSection";

const CORES_SUGERIDAS = [
  "#ef4444", "#f59e0b", "#eab308", "#10b981", "#059669",
  "#3b82f6", "#0ea5e9", "#8b5cf6", "#a855f7", "#ec4899",
  "#6b7280", "#84cc16", "#1e40af",
];

export const TagsSection = () => {
  const { tags, refetch } = useLeadTagsCatalog({ includeInactive: true });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTag | null>(null);
  const [form, setForm] = useState({
    nome: "",
    cor: "#3b82f6",
    emoji: "",
    categoria: "",
    ordem: 0,
    ativo: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ nome: "", cor: "#3b82f6", emoji: "", categoria: "", ordem: tags.length + 1, ativo: true });
    setIsDialogOpen(true);
  };

  const openEdit = (tag: LeadTag) => {
    setEditing(tag);
    setForm({
      nome: tag.nome,
      cor: tag.cor,
      emoji: tag.emoji || "",
      categoria: tag.categoria || "",
      ordem: tag.ordem,
      ativo: tag.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Nome da tag é obrigatório");
      return;
    }
    const payload = {
      nome: form.nome.trim(),
      cor: form.cor,
      emoji: form.emoji.trim() || null,
      categoria: form.categoria.trim() || null,
      ordem: form.ordem,
      ativo: form.ativo,
    };

    if (editing) {
      const { error } = await supabase.from("lead_tags" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error("Erro ao editar tag: " + error.message);
      toast.success("Tag atualizada");
    } else {
      const { error } = await supabase.from("lead_tags" as any).insert(payload);
      if (error) return toast.error("Erro ao criar tag: " + error.message);
      toast.success("Tag criada");
    }
    setIsDialogOpen(false);
    refetch();
  };

  const handleDelete = async (tag: LeadTag) => {
    if (!confirm(`Excluir a tag "${tag.nome}"? Ela será removida de todos os leads.`)) return;
    const { error } = await supabase.from("lead_tags" as any).delete().eq("id", tag.id);
    if (error) return toast.error("Erro ao excluir tag: " + error.message);
    toast.success("Tag excluída");
    refetch();
  };

  // Agrupa por categoria
  const grouped: Record<string, LeadTag[]> = {};
  tags.forEach((t) => {
    const c = t.categoria || "Outros";
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(t);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TagIcon className="h-5 w-5" />
          Tags de Leads
        </CardTitle>
        <Button onClick={openNew} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova tag
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Marcadores que assessores adicionam aos leads durante o atendimento. Não substituem o funil — servem para
          identificação rápida e filtros.
        </p>
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat}</h3>
            <div className="space-y-1">
              {list.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TagChip tag={tag} />
                    {!tag.ativo && (
                      <span className="text-[10px] text-muted-foreground uppercase">inativa</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tag)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(tag)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma tag cadastrada ainda.</p>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tag" : "Nova tag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  placeholder="🔥"
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Temperatura"
                />
              </div>
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="h-9 w-14 rounded border border-input"
                />
                <Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="flex-1" />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {CORES_SUGERIDAS.map((c) => (
                  <button
                    key={c}
                    className="h-6 w-6 rounded border border-border"
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, cor: c })}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
            <div>
              <Label>Prévia</Label>
              <div className="mt-1">
                <TagChip
                  tag={{
                    id: "preview",
                    nome: form.nome || "Prévia",
                    cor: form.cor,
                    emoji: form.emoji || null,
                    categoria: null,
                    ordem: 0,
                    ativo: true,
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
