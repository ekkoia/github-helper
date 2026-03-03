
-- 1. Drop existing CHECK constraints FIRST
ALTER TABLE public.auto_assign_config DROP CONSTRAINT IF EXISTS auto_assign_config_faixa_check;
ALTER TABLE public.auto_assign_state DROP CONSTRAINT IF EXISTS auto_assign_state_faixa_check;

-- 2. Rename existing 'acima_10k' data to '10k_50k'
UPDATE public.auto_assign_config SET faixa = '10k_50k' WHERE faixa = 'acima_10k';
UPDATE public.auto_assign_state SET faixa = '10k_50k' WHERE faixa = 'acima_10k';

-- 3. Recreate CHECK constraints with 4 values
ALTER TABLE public.auto_assign_config
  ADD CONSTRAINT auto_assign_config_faixa_check
  CHECK (faixa IN ('ate_10k', '10k_50k', '50k_150k', 'acima_150k'));

ALTER TABLE public.auto_assign_state
  ADD CONSTRAINT auto_assign_state_faixa_check
  CHECK (faixa IN ('ate_10k', '10k_50k', '50k_150k', 'acima_150k'));

-- 4. Insert initial state for new faixas
INSERT INTO public.auto_assign_state (faixa, last_assigned_order)
VALUES ('50k_150k', 0), ('acima_150k', 0)
ON CONFLICT DO NOTHING;

-- 5. Recreate auto_assign_lead() with 4 faixas
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_faixa text;
  v_last_order integer;
  v_next_user_id uuid;
  v_next_order integer;
  v_config_count integer;
  v_existing_responsavel uuid;
BEGIN
  IF NEW.responsavel_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT responsavel_id INTO v_existing_responsavel
  FROM leads
  WHERE responsavel_id IS NOT NULL
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.email IS NOT NULL AND NEW.email != '' AND lower(trim(email)) = lower(trim(NEW.email)))
      OR
      (NEW.telefone IS NOT NULL AND NEW.telefone != '' AND regexp_replace(telefone, '[^0-9]', '', 'g') = regexp_replace(NEW.telefone, '[^0-9]', '', 'g'))
    )
  ORDER BY data_criacao ASC
  LIMIT 1;

  IF v_existing_responsavel IS NOT NULL THEN
    NEW.responsavel_id := v_existing_responsavel;
    RETURN NEW;
  END IF;

  IF NEW.valor_produto IS NULL OR NEW.valor_produto <= 10000 THEN
    v_faixa := 'ate_10k';
  ELSIF NEW.valor_produto <= 50000 THEN
    v_faixa := '10k_50k';
  ELSIF NEW.valor_produto <= 150000 THEN
    v_faixa := '50k_150k';
  ELSE
    v_faixa := 'acima_150k';
  END IF;

  SELECT count(*) INTO v_config_count
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true;

  IF v_config_count = 0 THEN
    RETURN NEW;
  END IF;

  SELECT last_assigned_order INTO v_last_order
  FROM auto_assign_state
  WHERE faixa = v_faixa
  FOR UPDATE;

  SELECT user_id, ordem INTO v_next_user_id, v_next_order
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true AND ordem > v_last_order
  ORDER BY ordem ASC
  LIMIT 1;

  IF v_next_user_id IS NULL THEN
    SELECT user_id, ordem INTO v_next_user_id, v_next_order
    FROM auto_assign_config
    WHERE faixa = v_faixa AND ativo = true
    ORDER BY ordem ASC
    LIMIT 1;
  END IF;

  IF v_next_user_id IS NOT NULL THEN
    NEW.responsavel_id := v_next_user_id;
    UPDATE auto_assign_state
    SET last_assigned_order = v_next_order, updated_at = now()
    WHERE faixa = v_faixa;
  END IF;

  RETURN NEW;
END;
$function$;
