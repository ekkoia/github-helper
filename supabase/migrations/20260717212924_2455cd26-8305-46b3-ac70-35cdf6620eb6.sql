
-- 1) Trigger para normalizar telefone em dados_cliente (mesmo padrão da tabela leads)
CREATE OR REPLACE FUNCTION public.normalize_dados_cliente_telefone()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.telefone IS NOT NULL AND trim(NEW.telefone) <> '' THEN
    NEW.telefone := public.normalize_telefone_br(NEW.telefone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_dados_cliente_telefone ON public.dados_cliente;
CREATE TRIGGER trg_normalize_dados_cliente_telefone
BEFORE INSERT OR UPDATE OF telefone ON public.dados_cliente
FOR EACH ROW EXECUTE FUNCTION public.normalize_dados_cliente_telefone();

-- 2) Consolidar duplicatas por phone_key: mantém o menor id, faz merge de atendimento_ia/nomewpp e apaga os demais
WITH grupos AS (
  SELECT public.phone_key(telefone) AS pkey,
         MIN(id) AS keep_id,
         bool_or(atendimento_ia = 'pause') AS any_pause,
         (array_agg(nomewpp) FILTER (WHERE nomewpp IS NOT NULL AND trim(nomewpp) <> ''))[1] AS best_nome
  FROM public.dados_cliente
  WHERE telefone IS NOT NULL AND public.phone_key(telefone) IS NOT NULL
  GROUP BY public.phone_key(telefone)
  HAVING COUNT(*) > 1
)
UPDATE public.dados_cliente d
SET atendimento_ia = CASE WHEN g.any_pause THEN 'pause' ELSE d.atendimento_ia END,
    nomewpp = COALESCE(NULLIF(trim(d.nomewpp),''), g.best_nome)
FROM grupos g
WHERE d.id = g.keep_id;

DELETE FROM public.dados_cliente d
USING (
  SELECT public.phone_key(telefone) AS pkey, MIN(id) AS keep_id
  FROM public.dados_cliente
  WHERE telefone IS NOT NULL AND public.phone_key(telefone) IS NOT NULL
  GROUP BY public.phone_key(telefone)
  HAVING COUNT(*) > 1
) g
WHERE public.phone_key(d.telefone) = g.pkey
  AND d.id <> g.keep_id;

-- 3) Backfill: normaliza todos os telefones restantes para o padrão 55DDDNUMERO
UPDATE public.dados_cliente
SET telefone = public.normalize_telefone_br(telefone)
WHERE telefone IS NOT NULL
  AND telefone <> public.normalize_telefone_br(telefone);
