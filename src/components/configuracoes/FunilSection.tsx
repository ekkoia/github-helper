import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, GripVertical, Save, X } from "lucide-react";
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

export const FunilSection = () => {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEtapa, setEditingEtapa] = useState<Etapa | null>(null);
  const [deleteEtapaId, setDeleteEtapaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", cor: "#10b981" });
  const [isSaving, setIsSaving] = useState(false);

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
        <div className="space-y-3">
          {etapas.map((etapa) => (
            <div
              key={etapa.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: etapa.cor }} />
                <div>
                  <p className="font-medium">{etapa.nome}</p>
                  <p className="text-sm text-muted-foreground">Ordem: {etapa.ordem}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(etapa)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteEtapaId(etapa.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
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
