
DROP INDEX IF EXISTS public.dados_cliente_telefone_unique;
ALTER TABLE public.dados_cliente
  ADD CONSTRAINT dados_cliente_telefone_key UNIQUE (telefone);
