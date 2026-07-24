CREATE OR REPLACE FUNCTION public.normalize_telefone_br(_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  d text;
BEGIN
  IF _phone IS NULL OR trim(_phone) = '' THEN
    RETURN NULL;
  END IF;

  -- só dígitos
  d := regexp_replace(_phone, '[^0-9]', '', 'g');

  -- adiciona DDI 55 quando parecer BR sem DDI (10 = fixo, 11 = celular com 9)
  IF length(d) IN (10, 11) THEN
    d := '55' || d;
  END IF;

  -- validação mínima: pelo menos 12 dígitos e começando com 55
  IF length(d) < 12 OR left(d, 2) <> '55' THEN
    -- não bate no padrão BR: devolve só dígitos, sem perder o original
    RETURN regexp_replace(_phone, '[^0-9]', '', 'g');
  END IF;

  -- 12 dígitos = 55 + DDD + 8 (fixo) → mantém como está
  -- 13 dígitos = 55 + DDD + 9 + 8 (celular) → mantém o 9 (formato Meta)
  -- Não removemos mais o 9. Isso é o que a Meta espera no `to` / `wa_id`.
  RETURN d;
END;
$function$;