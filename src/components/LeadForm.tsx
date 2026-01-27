import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { leadSchema, LeadFormData } from "@/lib/validations";
import { useActivityLog } from "@/hooks/useActivityLog";

const ORIGEM_OPTIONS = [
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meta_form", label: "Formulário Nativo Meta" },
  { value: "campanha_mensagem", label: "Campanha de Mensagem" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site/Landing Page" },
  { value: "outro", label: "Outro" },
];

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export const LeadForm = ({ onSuccess, onCancel, initialData }: LeadFormProps) => {
  const { logActivity } = useActivityLog();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: initialData ? {
      nome_completo: initialData.nome_completo || "",
      telefone: initialData.telefone || "",
      email: initialData.email || "",
      volume: initialData.volume || "",
      valor_produto: initialData.valor_produto || undefined,
      origem: initialData.origem || "",
      observacoes: initialData.observacoes || "",
    } : {}
  });

  const onSubmit = async (data: LeadFormData) => {
    try {
      const submitData = {
        nome_completo: data.nome_completo,
        telefone: data.telefone,
        email: data.email,
        volume: data.volume || null,
        valor_produto: data.valor_produto || null,
        origem: data.origem || null,
        observacoes: data.observacoes || null,
        etapa_funil: initialData?.etapa_funil || "Novo Lead",
        perfil: initialData?.perfil || null,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("leads")
          .update(submitData)
          .eq("id", initialData.id);

        if (error) throw error;
        
        // Verificar se adicionou observações
        if (data.observacoes && data.observacoes !== initialData.observacoes) {
          await logActivity(
            'lead_notes_added',
            `Adicionou observação ao lead "${data.nome_completo}"`,
            { lead_id: initialData.id, lead_nome: data.nome_completo }
          );
        }
        
        // Registrar atividade de atualização
        await logActivity(
          'lead_updated',
          `Atualizou o lead "${data.nome_completo}"`,
          { lead_id: initialData.id, lead_nome: data.nome_completo }
        );
        
        toast.success("Lead atualizado com sucesso!");
      } else {
        const { data: newLead, error } = await supabase
          .from("leads")
          .insert([submitData])
          .select()
          .single();

        if (error) throw error;
        
        // Registrar atividade de criação
        await logActivity(
          'lead_created',
          `Criou o lead "${data.nome_completo}"`,
          { lead_id: newLead?.id, lead_nome: data.nome_completo }
        );
        
        toast.success("Lead criado com sucesso!");
      }

      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast.error("Erro ao salvar lead. Tente novamente.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nome Completo */}
      <div>
        <Label htmlFor="nome_completo">Nome Completo *</Label>
        <Input id="nome_completo" {...register("nome_completo")} />
        {errors.nome_completo && (
          <p className="text-xs text-destructive mt-1">{errors.nome_completo.message}</p>
        )}
      </div>

      {/* Telefone */}
      <div>
        <Label htmlFor="telefone">Telefone *</Label>
        <Input id="telefone" {...register("telefone")} placeholder="(XX) XXXXX-XXXX" />
        {errors.telefone && (
          <p className="text-xs text-destructive mt-1">{errors.telefone.message}</p>
        )}
      </div>

      {/* E-mail */}
      <div>
        <Label htmlFor="email">E-mail *</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && (
          <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Qtd Cotas */}
      <div>
        <Label htmlFor="volume">Qtd Cotas</Label>
        <Input id="volume" {...register("volume")} placeholder="Ex: 10" />
        {errors.volume && (
          <p className="text-xs text-destructive mt-1">{errors.volume.message}</p>
        )}
      </div>

      {/* Valor Investido */}
      <div>
        <Label htmlFor="valor_produto">Valor Investido (R$)</Label>
        <Input 
          id="valor_produto" 
          type="number" 
          step="0.01" 
          {...register("valor_produto", { valueAsNumber: true })} 
          placeholder="0,00"
        />
        {errors.valor_produto && (
          <p className="text-xs text-destructive mt-1">{String(errors.valor_produto.message)}</p>
        )}
      </div>

      {/* Origem do Lead */}
      <div>
        <Label htmlFor="origem">Origem do Lead</Label>
        <Select
          value={watch("origem") || ""}
          onValueChange={(value) => setValue("origem", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a origem" />
          </SelectTrigger>
          <SelectContent>
            {ORIGEM_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.origem && (
          <p className="text-xs text-destructive mt-1">{errors.origem.message}</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" {...register("observacoes")} rows={4} placeholder="Informações adicionais sobre o lead..." />
        {errors.observacoes && (
          <p className="text-xs text-destructive mt-1">{errors.observacoes.message}</p>
        )}
      </div>

      {/* Botões */}
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-primary" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : initialData ? "Atualizar" : "Criar Lead"}
        </Button>
      </div>
    </form>
  );
};
