
-- 1) Função de normalização para o formato Meta E.164 BR (sem +, sem 9 extra)
CREATE OR REPLACE FUNCTION public.normalize_telefone_br(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
BEGIN
  IF _phone IS NULL OR trim(_phone) = '' THEN
    RETURN NULL;
  END IF;

  -- só dígitos
  d := regexp_replace(_phone, '[^0-9]', '', 'g');

  -- se não tem DDI 55, adiciona (assumindo BR)
  IF length(d) IN (10, 11) THEN
    d := '55' || d;
  END IF;

  -- se tem DDI 55 + 11 dígitos (55 + DDD + 9 + 8) → remove o 9 extra
  IF length(d) = 13 AND left(d, 2) = '55' AND substr(d, 5, 1) = '9' THEN
    d := substr(d, 1, 4) || substr(d, 6);
  END IF;

  -- validação mínima: deve ter 12 dígitos (55 + DDD + 8)
  IF length(d) < 12 OR left(d, 2) <> '55' THEN
    -- retorna só dígitos se não bater no padrão BR, para não perder o dado original
    RETURN regexp_replace(_phone, '[^0-9]', '', 'g');
  END IF;

  RETURN d;
END;
$$;

-- 2) Trigger BEFORE INSERT/UPDATE para normalizar automaticamente
CREATE OR REPLACE FUNCTION public.normalize_lead_telefone()
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

DROP TRIGGER IF EXISTS trg_normalize_lead_telefone ON public.leads;
CREATE TRIGGER trg_normalize_lead_telefone
BEFORE INSERT OR UPDATE OF telefone ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.normalize_lead_telefone();

-- 3) Backfill dos telefones existentes
UPDATE public.leads
SET telefone = public.normalize_telefone_br(telefone)
WHERE telefone IS NOT NULL
  AND trim(telefone) <> ''
  AND telefone IS DISTINCT FROM public.normalize_telefone_br(telefone);
