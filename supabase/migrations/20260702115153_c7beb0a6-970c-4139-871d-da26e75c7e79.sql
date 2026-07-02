CREATE OR REPLACE FUNCTION public.auto_assign_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_responsavel uuid;
  v_last_user uuid;
  v_next_user uuid;
  v_lista uuid[];
  v_idx integer;
BEGIN
  IF NEW.responsavel_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Reaproveita responsável de lead duplicado
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

  INSERT INTO rodizio_state (id, contador, ultimo_user_id)
  VALUES (1, 0, NULL)
  ON CONFLICT (id) DO NOTHING;

  SELECT ultimo_user_id INTO v_last_user
  FROM rodizio_state
  WHERE id = 1
  FOR UPDATE;

  SELECT array_agg(user_id ORDER BY ordem, id) INTO v_lista
  FROM rodizio_config
  WHERE ativo = true;

  IF v_lista IS NULL OR array_length(v_lista, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_last_user IS NULL THEN
    v_next_user := v_lista[1];
  ELSE
    v_idx := array_position(v_lista, v_last_user);
    IF v_idx IS NULL OR v_idx >= array_length(v_lista, 1) THEN
      v_next_user := v_lista[1];
    ELSE
      v_next_user := v_lista[v_idx + 1];
    END IF;
  END IF;

  NEW.responsavel_id := v_next_user;

  UPDATE rodizio_state
  SET ultimo_user_id = v_next_user,
      contador = COALESCE(contador, 0) + 1,
      updated_at = now()
  WHERE id = 1;

  RETURN NEW;
END;
$function$;