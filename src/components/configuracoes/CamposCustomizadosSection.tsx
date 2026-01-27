import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CustomField {
  id: string;
  nome: string;
  label: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes: any;
  ordem: number;
}

export const CamposCustomizadosSection = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    label: "",
    tipo: "text",
    obrigatorio: false,
    opcoes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from("lead_custom_fields")
      .select("*")
      .eq("ativo", true)
      .order("ordem");

    if (error) {
      console.error("Erro ao buscar campos:", error);
      return;
    }

    setFields(data || []);
  };

  const handleOpenDialog = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        nome: field.nome,
        label: field.label,
        tipo: field.tipo,
        obrigatorio: field.obrigatorio,
        opcoes: field.opcoes ? JSON.stringify(field.opcoes) : "",
      });
    } else {
      setEditingField(null);
      setFormData({
        nome: "",
        label: "",
        tipo: "text",
        obrigatorio: false,
        opcoes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingField(null);
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.label.trim()) {
      toast.error("Nome e label são obrigatórios");
      return;
    }

    setIsSaving(true);

    let opcoes = null;
    if (formData.tipo === "select" && formData.opcoes) {
      try {
        opcoes = JSON.parse(formData.opcoes);
      } catch {
        toast.error("Formato inválido para opções (use JSON)");
        setIsSaving(false);
        return;
      }
    }

    if (editingField) {
      const { error } = await supabase
        .from("lead_custom_fields")
        .update({
          nome: formData.nome,
          label: formData.label,
          tipo: formData.tipo,
          obrigatorio: formData.obrigatorio,
          opcoes,
        })
        .eq("id", editingField.id);

      if (error) {
        toast.error("Erro ao atualizar campo: " + error.message);
        setIsSaving(false);
        return;
      }

      toast.success("Campo atualizado com sucesso!");
    } else {
      const maxOrdem = Math.max(...fields.map(f => f.ordem), 0);
      const { error } = await supabase
        .from("lead_custom_fields")
        .insert({
          nome: formData.nome,
          label: formData.label,
          tipo: formData.tipo,
          obrigatorio: formData.obrigatorio,
          opcoes,
          ordem: maxOrdem + 1,
          ativo: true,
        });

      if (error) {
        toast.error("Erro ao criar campo: " + error.message);
        setIsSaving(false);
        return;
      }

      toast.success("Campo criado com sucesso!");
    }

    setIsSaving(false);
    handleCloseDialog();
    fetchFields();
  };

  const handleDelete = async () => {
    if (!deleteFieldId) return;

    const { error } = await supabase
      .from("lead_custom_fields")
      .update({ ativo: false })
      .eq("id", deleteFieldId);

    if (error) {
      toast.error("Erro ao excluir campo: " + error.message);
      return;
    }

    toast.success("Campo excluído com sucesso!");
    setDeleteFieldId(null);
    fetchFields();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campos Customizados</CardTitle>
            <CardDescription>
              Adicione campos personalizados ao formulário de leads
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Campo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum campo customizado criado ainda
            </p>
          ) : (
            fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {field.tipo} {field.obrigatorio && "• Obrigatório"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(field)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteFieldId(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Editar Campo" : "Novo Campo"}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? "Edite as informações do campo customizado"
                : "Adicione um novo campo ao formulário de leads"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome (ID)</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: segmento_atuacao"
                  disabled={!!editingField}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identificador único (sem espaços)
                </p>
              </div>
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Segmento de Atuação"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nome exibido no formulário
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo de Campo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="select">Seleção</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="boolean">Sim/Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo === "select" && (
              <div>
                <Label htmlFor="opcoes">Opções (JSON)</Label>
                <Input
                  id="opcoes"
                  value={formData.opcoes}
                  onChange={(e) => setFormData({ ...formData, opcoes: e.target.value })}
                  placeholder='["Opção 1", "Opção 2", "Opção 3"]'
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Array JSON com as opções do select
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Campo Obrigatório</Label>
                <p className="text-xs text-muted-foreground">
                  O usuário será obrigado a preencher este campo
                </p>
              </div>
              <Switch
                checked={formData.obrigatorio}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, obrigatorio: checked })
                }
              />
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
      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este campo? Esta ação não pode ser desfeita e
              os dados associados serão perdidos.
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
