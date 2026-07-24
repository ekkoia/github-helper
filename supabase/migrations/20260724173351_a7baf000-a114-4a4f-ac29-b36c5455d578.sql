
CREATE OR REPLACE FUNCTION public.normalize_telefone_br(_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  d text;
  ddd int;
  local_part text;
  first_digit text;
BEGIN
  IF _phone IS NULL OR trim(_phone) = '' THEN
    RETURN _phone;
  END IF;

  d := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF d = '' THEN
    RETURN _phone;
  END IF;

  IF length(d) IN (12, 13) AND left(d, 2) = '55' THEN
    d := substr(d, 3);
  END IF;

  IF length(d) NOT IN (10, 11) THEN
    RETURN d;
  END IF;

  ddd := substr(d, 1, 2)::int;
  local_part := substr(d, 3);

  -- Se veio com 9 na frente (11 dígitos começando com 9), remove pra ter base de 8 dígitos
  IF length(local_part) = 9 AND left(local_part, 1) = '9' THEN
    local_part := substr(local_part, 2);
  END IF;

  first_digit := left(local_part, 1);

  -- Regra Meta: DDD 11-28 força 9 na frente APENAS para celulares (assinante inicia com 6/7/8/9).
  -- Fixos (2-5) mantêm 12 dígitos.
  IF ddd BETWEEN 11 AND 28 THEN
    IF first_digit IN ('6','7','8','9') THEN
      RETURN '55' || lpad(ddd::text, 2, '0') || '9' || local_part;
    ELSE
      RETURN '55' || lpad(ddd::text, 2, '0') || local_part;
    END IF;
  ELSE
    RETURN '55' || lpad(ddd::text, 2, '0') || local_part;
  END IF;
END;
$function$;

-- Backfill leads e dados_cliente
UPDATE public.leads
SET telefone = public.normalize_telefone_br(telefone)
WHERE telefone IS NOT NULL
  AND trim(telefone) <> ''
  AND public.normalize_telefone_br(telefone) IS DISTINCT FROM telefone;

UPDATE public.dados_cliente
SET telefone = public.normalize_telefone_br(telefone)
WHERE telefone IS NOT NULL
  AND trim(telefone) <> ''
  AND public.normalize_telefone_br(telefone) IS DISTINCT FROM telefone;
