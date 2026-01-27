import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { leadSchema, LeadFormData } from "@/lib/validations";
import { useActivityLog } from "@/hooks/useActivityLog";

interface LeadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const ETAPAS_FUNIL = [
  "Novo Lead",
  "Em atendimento IA",
  "Atendimento Humano",
  "Reunião Agendada",
  "Proposta Enviada",
  "Ganho",
  "Perdido",
  "Sem interesse",
  "Ghost",
  "Nutrir"
];

export const LeadForm = ({ onSuccess, onCancel, initialData }: LeadFormProps) => {
  const { logActivity } = useActivityLog();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: initialData ? {
      ...initialData,
      valor_produto: initialData.valor_produto || undefined,
      distancia_km: initialData.distancia_km || undefined,
      estrada_terra_km: initialData.estrada_terra_km || undefined,
      percentual_royalties: initialData.percentual_royalties || undefined,
      // Converter boolean do banco para string do formulário
      tem_royalties: initialData.tem_royalties === true 
        ? "Sim" 
        : initialData.tem_royalties === false 
          ? "Não" 
          : "Não informado",
    } : {
      etapa_funil: "Novo Lead",
      tem_royalties: "Não informado"
    }
  });

  const tem_royalties = watch("tem_royalties");

  const onSubmit = async (data: LeadFormData) => {
    try {
      // Converter tem_royalties de string para boolean
      let temRoyaltiesValue: boolean | null = null;
      if (data.tem_royalties === "Sim") {
        temRoyaltiesValue = true;
      } else if (data.tem_royalties === "Não") {
        temRoyaltiesValue = false;
      }

      // Garantir que campos obrigatórios estão preenchidos
      const submitData = {
        nome_completo: data.nome_completo,
        telefone: data.telefone,
        email: data.email,
        perfil: data.perfil,
        etapa_funil: data.etapa_funil,
        protocolo_atendimento: data.protocolo_atendimento || null,
        intencao: data.intencao || null,
        tipo_grao: data.tipo_grao || null,
        volume: data.volume || null,
        valor_produto: data.valor_produto || null,
        cidade: data.cidade || null,
        uf: data.uf || null,
        localizacao_embarque: data.localizacao_embarque || null,
        distancia_km: data.distancia_km || null,
        sentido: data.sentido || null,
        estrada_terra_km: data.estrada_terra_km || null,
        armazenamento: data.armazenamento || null,
        qualidade: data.qualidade || null,
        tem_royalties: temRoyaltiesValue,
        percentual_royalties: data.percentual_royalties || null,
        observacoes: data.observacoes || null,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("leads")
          .update(submitData)
          .eq("id", initialData.id);

        if (error) throw error;
        
        // Verificar se mudou para Ganho ou Perdido
        const etapaAnterior = initialData.etapa_funil;
        const etapaNova = data.etapa_funil;
        
        if (etapaNova === 'Ganho' && etapaAnterior !== 'Ganho') {
          await logActivity(
            'lead_won',
            `Marcou o lead "${data.nome_completo}" como Ganho`,
            { lead_id: initialData.id, lead_nome: data.nome_completo, etapa_anterior: etapaAnterior }
          );
        } else if (etapaNova === 'Perdido' && etapaAnterior !== 'Perdido') {
          await logActivity(
            'lead_lost',
            `Marcou o lead "${data.nome_completo}" como Perdido`,
            { lead_id: initialData.id, lead_nome: data.nome_completo, etapa_anterior: etapaAnterior }
          );
        }
        
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
          { lead_id: newLead?.id, lead_nome: data.nome_completo, perfil: data.perfil }
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
      {/* Identificação */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Identificação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome_completo">Nome Completo *</Label>
            <Input id="nome_completo" {...register("nome_completo")} />
            {errors.nome_completo && (
              <p className="text-xs text-destructive mt-1">{errors.nome_completo.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="telefone">Telefone * (DDD)</Label>
            <Input id="telefone" {...register("telefone")} placeholder="(XX) XXXXX-XXXX" />
            {errors.telefone && (
              <p className="text-xs text-destructive mt-1">{errors.telefone.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="perfil">Perfil *</Label>
            <Select 
              onValueChange={(value) => setValue("perfil", value as "Produtor" | "Corretor" | "Armazém")} 
              defaultValue={initialData?.perfil}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Produtor">Produtor</SelectItem>
                <SelectItem value="Corretor">Corretor</SelectItem>
                <SelectItem value="Armazém">Armazém</SelectItem>
              </SelectContent>
            </Select>
            {errors.perfil && (
              <p className="text-xs text-destructive mt-1">{errors.perfil.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="protocolo_atendimento">Protocolo Atendimento</Label>
            <Input id="protocolo_atendimento" {...register("protocolo_atendimento")} placeholder="Ex: IMACIA6888" />
          </div>
          <div>
            <Label htmlFor="etapa_funil">Etapa do Funil *</Label>
            <Select 
              onValueChange={(value) => setValue("etapa_funil", value as LeadFormData["etapa_funil"])} 
              defaultValue={initialData?.etapa_funil || "Novo Lead"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS_FUNIL.map((etapa) => (
                  <SelectItem key={etapa} value={etapa}>{etapa}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.etapa_funil && (
              <p className="text-xs text-destructive mt-1">{errors.etapa_funil.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Negociação */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Negociação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="intencao">Intenção</Label>
            <Select 
              onValueChange={(value) => setValue("intencao", value as "Comprar" | "Vender")} 
              defaultValue={initialData?.intencao}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comprar">Comprar</SelectItem>
                <SelectItem value="Vender">Vender</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tipo_grao">Tipo de Grão</Label>
            <Select 
              onValueChange={(value) => setValue("tipo_grao", value as "Soja" | "Milho")} 
              defaultValue={initialData?.tipo_grao}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Soja">Soja</SelectItem>
                <SelectItem value="Milho">Milho</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="volume">Volume</Label>
            <Input id="volume" {...register("volume")} placeholder="Ex: 1000 sacas" />
          </div>
          <div>
            <Label htmlFor="valor_produto">Valor/Produto (R$)</Label>
            <Input id="valor_produto" type="number" step="0.01" {...register("valor_produto", { valueAsNumber: true })} />
          </div>
        </div>
      </div>

      {/* Localização */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Localização
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" {...register("cidade")} />
          </div>
          <div>
            <Label htmlFor="uf">UF</Label>
            <Select onValueChange={(value) => setValue("uf", value)} defaultValue={initialData?.uf}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BR.map((estado) => (
                  <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="localizacao_embarque">Localização Embarque</Label>
            <Input id="localizacao_embarque" {...register("localizacao_embarque")} />
          </div>
          <div>
            <Label htmlFor="distancia_km">Distância (km)</Label>
            <Input id="distancia_km" type="number" step="0.1" {...register("distancia_km", { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="sentido">Sentido</Label>
            <Select 
              onValueChange={(value) => setValue("sentido", value as "Norte" | "Sul" | "Leste" | "Oeste")} 
              defaultValue={initialData?.sentido}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Norte">Norte</SelectItem>
                <SelectItem value="Sul">Sul</SelectItem>
                <SelectItem value="Leste">Leste</SelectItem>
                <SelectItem value="Oeste">Oeste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="estrada_terra_km">Estrada de Terra (km)</Label>
            <Input id="estrada_terra_km" type="number" step="0.1" {...register("estrada_terra_km", { valueAsNumber: true })} />
          </div>
        </div>
      </div>

      {/* Dados Técnicos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
          Dados Técnicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="armazenamento">Armazenamento</Label>
            <Select 
              onValueChange={(value) => setValue("armazenamento", value as "Silo Bolsa" | "Silo Metálico" | "Colheitadeira" | "Outro")} 
              defaultValue={initialData?.armazenamento}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Silo Bolsa">Silo Bolsa</SelectItem>
                <SelectItem value="Silo Metálico">Silo Metálico</SelectItem>
                <SelectItem value="Colheitadeira">Colheitadeira</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="qualidade">Qualidade</Label>
            <Input id="qualidade" {...register("qualidade")} />
          </div>
          <div>
            <Label htmlFor="tem_royalties">Tem Royalties</Label>
            <Select 
              onValueChange={(value) => setValue("tem_royalties", value as "Sim" | "Não" | "Não informado")} 
              defaultValue={initialData?.tem_royalties || "Não informado"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sim">Sim</SelectItem>
                <SelectItem value="Não">Não</SelectItem>
                <SelectItem value="Não informado">Não informado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tem_royalties === "Sim" && (
            <div>
              <Label htmlFor="percentual_royalties">% Royalties</Label>
              <Input id="percentual_royalties" type="number" step="0.01" {...register("percentual_royalties", { valueAsNumber: true })} />
            </div>
          )}
        </div>
      </div>

      {/* Observações */}
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea id="observacoes" {...register("observacoes")} rows={4} />
      </div>

      {/* Botões */}
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-gradient-primary">
          {initialData ? "Atualizar" : "Criar"} Lead
        </Button>
      </div>
    </form>
  );
};
