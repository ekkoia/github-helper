-- Cleanup: merge observações from duplicates into the oldest record, then delete duplicates
-- Step 1: Update oldest records with merged observações from duplicates
WITH ranked AS (
  SELECT 
    id,
    email,
    observacoes,
    ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as rn
  FROM leads
  WHERE email IS NOT NULL AND email != ''
    AND lower(trim(email)) IN (
      SELECT lower(trim(email))
      FROM leads
      WHERE email IS NOT NULL AND email != ''
      GROUP BY lower(trim(email))
      HAVING COUNT(*) > 1
    )
),
oldest AS (
  SELECT id, email FROM ranked WHERE rn = 1
),
dupe_notes AS (
  SELECT 
    o.id as keep_id,
    string_agg(
      '[Duplicado removido ' || r.id || '] ' || COALESCE(r.observacoes, '(sem obs)'),
      chr(10)
    ) as merged_obs
  FROM ranked r
  JOIN oldest o ON lower(trim(r.email)) = lower(trim(o.email))
  WHERE r.rn > 1
  GROUP BY o.id
)
UPDATE leads
SET observacoes = COALESCE(leads.observacoes, '') || chr(10) || '[Desduplicação automática] ' || dn.merged_obs
FROM dupe_notes dn
WHERE leads.id = dn.keep_id;

-- Step 2: Delete duplicate records (keep rn=1, delete rn>1)
DELETE FROM leads
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as rn
    FROM leads
    WHERE email IS NOT NULL AND email != ''
      AND lower(trim(email)) IN (
        SELECT lower(trim(email))
        FROM leads
        WHERE email IS NOT NULL AND email != ''
        GROUP BY lower(trim(email))
        HAVING COUNT(*) > 1
      )
  ) ranked
  WHERE rn > 1
);

-- Step 3: Also add deduplication to sync_meta_lead_to_crm trigger
-- When a meta lead arrives, check if a lead with same email already exists
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  lead_observacoes text;
  lead_valor_produto numeric;
  lead_created_time_brasil timestamp;
  v_existing_lead_id uuid;
BEGIN
  -- Converter valor_investimento para numérico
  CASE NEW.valor_investimento
    WHEN 'até R$10 mil' THEN lead_valor_produto := 10000;
    WHEN 'de R$10 mil a R$50 mil' THEN lead_valor_produto := 30000;
    WHEN 'de R$50 mil a R$100 mil' THEN lead_valor_produto := 75000;
    WHEN 'acima de R$100 mil' THEN lead_valor_produto := 100000;
    ELSE lead_valor_produto := NULL;
  END CASE;

  -- Converter created_time para timestamp SEM conversão de timezone
  IF NEW.created_time IS NOT NULL AND NEW.created_time != '' THEN
    lead_created_time_brasil := TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI');
  ELSE
    lead_created_time_brasil := NULL;
  END IF;

  -- Construir observações com informações do anúncio
  lead_observacoes := 'Valor pretendido: ' || COALESCE(NEW.valor_investimento, 'Não informado');
  
  IF NEW.form_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Formulário: ' || NEW.form_name;
  END IF;
  
  IF NEW.ad_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Anúncio: ' || NEW.ad_name;
  END IF;
  
  IF NEW.adset_name IS NOT NULL THEN
    lead_observacoes := lead_observacoes || chr(10) || 'Conjunto: ' || NEW.adset_name;
  END IF;

  -- DEDUPLICATION: Check if lead with same email already exists
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    SELECT id INTO v_existing_lead_id
    FROM leads
    WHERE lower(trim(email)) = lower(trim(NEW.email))
    ORDER BY data_criacao ASC
    LIMIT 1;
  END IF;

  IF v_existing_lead_id IS NOT NULL THEN
    -- Update existing lead with new meta data
    UPDATE leads
    SET 
      observacoes = COALESCE(observacoes, '') || chr(10) || '[Meta Form ' || NOW()::text || '] ' || lead_observacoes,
      meta_lead_id = COALESCE(meta_lead_id, NEW.id),
      valor_produto = COALESCE(valor_produto, lead_valor_produto),
      created_time_brasil = COALESCE(created_time_brasil, lead_created_time_brasil),
      data_atualizacao = now()
    WHERE id = v_existing_lead_id;
  ELSE
    -- Insert new lead (original behavior)
    INSERT INTO public.leads (
      nome_completo,
      telefone,
      email,
      origem,
      etapa_funil,
      observacoes,
      valor_produto,
      meta_lead_id,
      data_criacao,
      created_time_brasil
    )
    VALUES (
      COALESCE(NEW.nome_completo, 'Não informado'),
      NEW.telefone,
      NEW.email,
      'meta_form',
      'Novo Lead',
      lead_observacoes,
      lead_valor_produto,
      NEW.id,
      COALESCE(NEW.created_at, now()),
      lead_created_time_brasil
    )
    ON CONFLICT (meta_lead_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;