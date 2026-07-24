CREATE OR REPLACE FUNCTION public.normalize_telefone_br(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
  ddd int;
  local_part text;
BEGIN
  IF _phone IS NULL OR trim(_phone) = '' THEN
    RETURN _phone;
  END IF;

  d := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF d = '' THEN
    RETURN _phone;
  END IF;

  -- Remove DDI 55 se presente para trabalhar só com DDD+número
  IF length(d) IN (12, 13) AND left(d, 2) = '55' THEN
    d := substr(d, 3);
  END IF;

  -- Precisa ter DDD (2) + assinante (8 ou 9)
  IF length(d) NOT IN (10, 11) THEN
    RETURN d; -- não bate no padrão BR: devolve só dígitos
  END IF;

  ddd := substr(d, 1, 2)::int;
  local_part := substr(d, 3);

  -- Se veio com o 9 (11 dígitos), remove-o para termos o "assinante base"
  IF length(local_part) = 9 AND left(local_part, 1) = '9' THEN
    local_part := substr(local_part, 2);
  END IF;

  -- Agora local_part tem 8 dígitos. Aplica a regra da Meta:
  --   DDD 11-28  -> força 9 na frente (celular)
  --   DDD 29-99  -> mantém sem o 9
  IF ddd BETWEEN 11 AND 28 THEN
    RETURN '55' || lpad(ddd::text, 2, '0') || '9' || local_part;
  ELSE
    RETURN '55' || lpad(ddd::text, 2, '0') || local_part;
  END IF;
END;
$$;