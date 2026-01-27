import { z } from "zod";

// Regex para telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;

export const leadSchema = z.object({
  nome_completo: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  
  telefone: z.string()
    .regex(phoneRegex, "Telefone deve estar no formato (XX) XXXXX-XXXX"),
  
  email: z.string()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  
  perfil: z.enum(["Produtor", "Corretor", "Armazém"], {
    required_error: "Selecione um perfil"
  }),
  
  protocolo_atendimento: z.string().max(50).optional(),
  
  intencao: z.enum(["Comprar", "Vender"]).optional(),
  
  tipo_grao: z.enum(["Soja", "Milho"]).optional(),
  
  volume: z.string().max(100).optional(),
  
  valor_produto: z.number()
    .positive("Valor deve ser positivo")
    .optional()
    .or(z.literal(undefined)),
  
  cidade: z.string().max(100).optional(),
  
  uf: z.string().length(2, "UF deve ter 2 caracteres").optional(),
  
  localizacao_embarque: z.string().max(255).optional(),
  
  distancia_km: z.number()
    .positive("Distância deve ser positiva")
    .optional()
    .or(z.literal(undefined)),
  
  sentido: z.enum(["Norte", "Sul", "Leste", "Oeste"]).optional(),
  
  estrada_terra_km: z.number()
    .nonnegative("Distância não pode ser negativa")
    .optional()
    .or(z.literal(undefined)),
  
  armazenamento: z.enum(["Silo Bolsa", "Silo Metálico", "Colheitadeira", "Outro"]).optional(),
  
  qualidade: z.string().max(255).optional(),
  
  tem_royalties: z.enum(["Sim", "Não", "Não informado"]).optional(),
  
  percentual_royalties: z.number()
    .min(0, "Percentual não pode ser negativo")
    .max(100, "Percentual não pode ser maior que 100")
    .optional()
    .or(z.literal(undefined)),
  
  etapa_funil: z.string().min(1, "Selecione uma etapa do funil"),
  
  observacoes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
}).refine(
  (data) => {
    // Se tem_royalties for "Sim", percentual_royalties é obrigatório
    if (data.tem_royalties === "Sim" && !data.percentual_royalties) {
      return false;
    }
    return true;
  },
  {
    message: "Percentual de royalties é obrigatório quando 'Tem Royalties' é 'Sim'",
    path: ["percentual_royalties"],
  }
);

export type LeadFormData = z.infer<typeof leadSchema>;
