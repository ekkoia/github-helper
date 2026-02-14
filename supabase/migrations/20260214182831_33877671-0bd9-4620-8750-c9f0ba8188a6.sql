CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faixa text;
  v_last_order integer;
  v_next_user_id uuid;
  v_next_order integer;
  v_config_count integer;
  v_existing_responsavel uuid;
BEGIN
  -- Se já tem responsável, não faz nada
  IF NEW.responsavel_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- DESDUPLICAÇÃO: buscar responsável de lead existente com mesmo email ou telefone
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

  -- Determinar a faixa com base no valor_produto
  IF NEW.valor_produto IS NULL OR NEW.valor_produto <= 10000 THEN
    v_faixa := 'ate_10k';
  ELSE
    v_faixa := 'acima_10k';
  END IF;

  -- Contar usuários ativos na faixa
  SELECT count(*) INTO v_config_count
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true;

  -- Se não há usuários configurados, retorna sem atribuir
  IF v_config_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Buscar último ordem atribuído
  SELECT last_assigned_order INTO v_last_order
  FROM auto_assign_state
  WHERE faixa = v_faixa
  FOR UPDATE;

  -- Buscar próximo usuário (round-robin)
  SELECT user_id, ordem INTO v_next_user_id, v_next_order
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true AND ordem > v_last_order
  ORDER BY ordem ASC
  LIMIT 1;

  -- Se não encontrou (chegou ao fim), volta ao início
  IF v_next_user_id IS NULL THEN
    SELECT user_id, ordem INTO v_next_user_id, v_next_order
    FROM auto_assign_config
    WHERE faixa = v_faixa AND ativo = true
    ORDER BY ordem ASC
    LIMIT 1;
  END IF;

  -- Atribuir o lead
  IF v_next_user_id IS NOT NULL THEN
    NEW.responsavel_id := v_next_user_id;

    -- Atualizar estado do round-robin
    UPDATE auto_assign_state
    SET last_assigned_order = v_next_order, updated_at = now()
    WHERE faixa = v_faixa;
  END IF;

  RETURN NEW;
END;
$$;