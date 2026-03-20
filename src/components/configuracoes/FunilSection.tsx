import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface Etapa {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
}

const SortableEtapa = ({
  etapa,
  onEdit,
  onDelete,
}: {
  etapa: Etapa;
  onEdit: (etapa: Etapa) => void;
  onDelete: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: etapa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-background"
    >
      <div className="flex items-center gap-4">
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: etapa.cor }} />
        <div>
          <p className="font-medium">{etapa.nome}</p>
          <p className="text-sm text-muted-foreground">Ordem: {etapa.ordem}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(etapa)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(etapa.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const FunilSection = () => {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null);
  const [deleteEtapaId, setDeleteEtapaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", cor: "#10b981" });
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = etapas.findIndex((e) => e.id === active.id);
    const newIndex = etapas.findIndex((e) => e.id === over.id);
    const novaOrdem = arrayMove(etapas, oldIndex, newIndex);

    setEtapas(novaOrdem);

    const updates = novaOrdem.map((etapa, index) =>
      supabase
        .from("funil_etapas")
        .update({ ordem: index + 1 })
        .eq("id", etapa.id),
    );

    const results = await Promise.all(updates);
    const hasError = results.some((r) => r.error);

    if (hasError) {
      toast.error("Erro ao salvar nova ordem");
      fetchEtapas();
    } else {
      setEtapas(novaOrdem.map((e, i) => ({ ...e, ordem: i + 1 })));
    }
  };

  useEffect(() => {
    fetchEtapas();
  }, []);

  const fetchEtapas = async () => {
    const { data, error } = await supabase.from("funil_etapas").select("*").eq("ativo", true).order("ordem");

    if (error) {
      console.error("Erro ao buscar etapas:", error);
      return;
    }

    setEtapas(data || []);
  };

  const handleOpenDialog = (etapa?: Etapa) => {
    if (etapa) {
      setEditingEtapa(etapa);
      setFormData({ nome: etapa.nome, cor: etapa.cor });
    } else {
      setEditingEtapa(null);
      setFormData({ nome: "", cor: "#10b981" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEtapa(null);
    setFormData({ nome: "", cor: "#10b981" });
  };

  const handleSave = async () => {
    if (editingEtapa) {
      const nomeAntigo = etapas.find((e) => e.id === editingEtapa.id)?.nome;

      const { error } = await supabase
        .from("funil_etapas")
        .update({ nome: formData.nome, cor: formData.cor })
        .eq("id", editingEtapa.id);

      if (error) {
        toast.error("Erro ao atualizar etapa: " + error.message);
        setIsSaving(false);
        return;
      }

      if (nomeAntigo && nomeAntigo !== formData.nome) {
        const { error: leadsError } = await supabase
          .from("leads")
          .update({ etapa_funil: formData.nome })
          .eq("etapa_funil", nomeAntigo);

        if (leadsError) {
          toast.error("Etapa renomeada, mas erro ao migrar leads: " + leadsError.message);
          setIsSaving(false);
          return;
        }
      }

      toast.success("Etapa atualizada com sucesso!");
    } else {
      const maxOrdem = Math.max(...etapas.map((e) => e.ordem), 0);
      const { error } = await supabase.from("funil_etapas").insert({
        nome: formData.nome,
        cor: formData.cor,
        ordem: maxOrdem + 1,
        ativo: true,
      });

      if (error) {
        toast.error("Erro ao criar etapa: " + error.message);
        setIsSaving(false);
        return;
      }

      toast.success("Etapa criada com sucesso!");
    }

    setIsSaving(false);
    handleCloseDialog();
    fetchEtapas();
  };

  const handleDelete = async () => {
    if (!deleteEtapaId) return;

    const { error } = await supabase.from("funil_etapas").update({ ativo: false }).eq("id", deleteEtapaId);

    if (error) {
      toast.error("Erro ao excluir etapa: " + error.message);
      return;
    }

    toast.success("Etapa excluída com sucesso!");
    setDeleteEtapaId(null);
    fetchEtapas();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Etapas do Funil</CardTitle>
            <CardDescription>Personalize as etapas do funil de vendas</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Etapa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={etapas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {etapas.map((etapa) => (
                <SortableEtapa key={etapa.id} etapa={etapa} onEdit={handleOpenDialog} onDelete={setDeleteEtapaId} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEtapa ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
            <DialogDescription>
              {editingEtapa ? "Edite as informações da etapa do funil" : "Adicione uma nova etapa ao funil de vendas"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Etapa</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Proposta em Análise"
              />
            </div>
            <div>
              <Label htmlFor="cor">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  placeholder="#10b981"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteEtapaId} onOpenChange={() => setDeleteEtapaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta etapa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
