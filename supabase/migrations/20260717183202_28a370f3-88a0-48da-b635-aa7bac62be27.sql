-- Remove duplicatas mantendo o registro mais recente por telefone
DELETE FROM public.dados_cliente a
USING public.dados_cliente b
WHERE a.telefone = b.telefone
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS dados_cliente_telefone_unique
  ON public.dados_cliente (telefone)
  WHERE telefone IS NOT NULL;