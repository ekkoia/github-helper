
-- 1. Nova etapa
INSERT INTO public.funil_etapas (nome, ordem, cor, ativo)
SELECT 'Lead WhatsApp (não qualificado)', 13, '#9ca3af', true
WHERE NOT EXISTS (SELECT 1 FROM public.funil_etapas WHERE nome = 'Lead WhatsApp (não qualificado)');

-- 2. Ajusta auto_assign_lead para não distribuir leads dessa etapa
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

  -- Não distribuir leads WhatsApp não qualificados
  IF NEW.etapa_funil = 'Lead WhatsApp (não qualificado)' THEN
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

-- 3. Backfill de leads órfãos do WhatsApp
INSERT INTO public.leads (
  nome_completo, telefone, origem, origens, etapa_funil, observacoes, data_criacao
)
SELECT
  COALESCE(
    (SELECT nomewpp FROM chat_messages cm2
       WHERE cm2.phone = cm.phone AND cm2.nomewpp IS NOT NULL AND TRIM(cm2.nomewpp) <> ''
       ORDER BY cm2.created_at NULLS LAST LIMIT 1),
    'Lead WhatsApp'
  ) AS nome_completo,
  cm.phone,
  'whatsapp',
  '["whatsapp"]'::jsonb,
  'Lead WhatsApp (não qualificado)',
  '[Importado de chat_messages]',
  COALESCE(MIN(cm.created_at), now())
FROM chat_messages cm
WHERE cm.phone IS NOT NULL AND TRIM(cm.phone) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.telefone IS NOT NULL
      AND regexp_replace(l.telefone, '[^0-9]', '', 'g') = regexp_replace(cm.phone, '[^0-9]', '', 'g')
  )
GROUP BY cm.phone;

-- 4. Trigger para criar lead quando chega nova mensagem WhatsApp
CREATE OR REPLACE FUNCTION public.create_lead_from_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.phone IS NULL OR TRIM(NEW.phone) = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM leads l
    WHERE l.telefone IS NOT NULL
      AND regexp_replace(l.telefone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone, '[^0-9]', '', 'g')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO leads (nome_completo, telefone, origem, origens, etapa_funil, observacoes)
  VALUES (
    COALESCE(NULLIF(TRIM(NEW.nomewpp), ''), 'Lead WhatsApp'),
    NEW.phone,
    'whatsapp',
    '["whatsapp"]'::jsonb,
    'Lead WhatsApp (não qualificado)',
    '[Criado automaticamente via chat_messages]'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_lead_from_chat_message ON public.chat_messages;
CREATE TRIGGER trg_create_lead_from_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_from_chat_message();

-- 5. Função RPC para timeline de interações
CREATE OR REPLACE FUNCTION public.get_lead_interactions(_lead_id uuid)
 RETURNS TABLE(source text, role text, content text, occurred_at timestamptz, ord bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone_digits text;
BEGIN
  SELECT regexp_replace(telefone, '[^0-9]', '', 'g') INTO v_phone_digits
  FROM leads WHERE id = _lead_id;

  IF v_phone_digits IS NULL OR length(v_phone_digits) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 'chat'::text AS source,
         'user'::text AS role,
         cm.user_message AS content,
         cm.created_at AS occurred_at,
         cm.id::bigint AS ord
  FROM chat_messages cm
  WHERE cm.user_message IS NOT NULL
    AND regexp_replace(cm.phone, '[^0-9]', '', 'g') = v_phone_digits
  UNION ALL
  SELECT 'chat'::text, 'bot'::text, cm.bot_message, cm.created_at, cm.id::bigint
  FROM chat_messages cm
  WHERE cm.bot_message IS NOT NULL
    AND regexp_replace(cm.phone, '[^0-9]', '', 'g') = v_phone_digits
  UNION ALL
  SELECT 'n8n'::text,
         CASE WHEN n.message->>'type' = 'human' THEN 'user' ELSE 'bot' END,
         n.message->>'content',
         NULL::timestamptz,
         n.id::bigint
  FROM n8n_chat_histories n
  WHERE regexp_replace(n.session_id, '[^0-9]', '', 'g') = v_phone_digits
  ORDER BY occurred_at NULLS LAST, ord ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_lead_interactions(uuid) TO authenticated;
