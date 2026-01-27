-- Remover a constraint antiga de sentido
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_sentido_check;

-- Adicionar nova constraint com todos os pontos cardeais e colaterais
ALTER TABLE public.leads ADD CONSTRAINT leads_sentido_check CHECK (sentido IN (
  'Norte',
  'Sul',
  'Leste',
  'Oeste',
  'Nordeste',
  'Noroeste',
  'Sudeste',
  'Sudoeste'
));