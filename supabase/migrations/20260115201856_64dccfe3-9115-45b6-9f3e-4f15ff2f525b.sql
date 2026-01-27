-- Remover a constraint antiga
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_etapa_funil_check;

-- Adicionar nova constraint com "Parceiro"
ALTER TABLE public.leads ADD CONSTRAINT leads_etapa_funil_check CHECK (etapa_funil IN (
  'Novo Lead',
  'Em atendimento IA',
  'Atendimento Humano',
  'Reunião Agendada',
  'Proposta Enviada',
  'Ganho',
  'Perdido',
  'Sem interesse',
  'Ghost',
  'Nutrir',
  'Parceiro'
));