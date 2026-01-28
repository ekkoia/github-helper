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
  
  volume: z.string().max(100, "Qtd Cotas deve ter no máximo 100 caracteres").optional(),
  
  valor_produto: z.number()
    .positive("Valor deve ser positivo")
    .optional()
    .or(z.literal(undefined)),
  
  investimento_real: z.number()
    .positive("Valor deve ser positivo")
    .optional()
    .or(z.literal(undefined)),
  
  etapa_funil: z.string().min(1, "Selecione uma etapa do funil").optional(),
  
  origem: z.string().max(100, "Origem deve ter no máximo 100 caracteres").optional(),
  
  observacoes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
