
-- PARTE A: Limpar duplicatas existentes (merge observações e origens, depois deletar)

-- 1. Merge observações dos duplicados no registro mais antigo
WITH duplicates AS (
  SELECT id, email, observacoes, origens, data_criacao,
    ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as rn,
    FIRST_VALUE(id) OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as keep_id
  FROM leads
  WHERE email IS NOT NULL AND email != ''
    AND lower(trim(email)) IN (
      SELECT lower(trim(e.email)) FROM leads e
      WHERE e.email IS NOT NULL AND e.email != ''
      GROUP BY lower(trim(e.email)) HAVING COUNT(*) > 1
    )
)
UPDATE leads SET
  observacoes = leads.observacoes || E'\n[Merge duplicata] ' || COALESCE(d.observacoes, ''),
  origens = CASE
    WHEN leads.origens IS NULL THEN d.origens
    WHEN d.origens IS NULL THEN leads.origens
    ELSE leads.origens || d.origens
  END,
  data_atualizacao = NOW()
FROM duplicates d
WHERE leads.id = d.keep_id
  AND d.rn > 1;

-- 2. Deletar os registros duplicados (mantém o mais antigo)
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY data_criacao ASC) as rn
  FROM leads
  WHERE email IS NOT NULL AND email != ''
    AND lower(trim(email)) IN (
      SELECT lower(trim(e.email)) FROM leads e
      WHERE e.email IS NOT NULL AND e.email != ''
      GROUP BY lower(trim(e.email)) HAVING COUNT(*) > 1
    )
)
DELETE FROM leads WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- PARTE B: Criar índice único parcial no email (prevenção definitiva)
CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique_idx 
ON leads (lower(trim(email))) 
WHERE email IS NOT NULL AND email != '';

-- PARTE C: Atualizar trigger sync_meta_lead_to_crm para usar ON CONFLICT
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  valor_num NUMERIC;
  obs_text TEXT;
  created_brasil TEXT;
BEGIN
  -- Converter valor_investimento para numérico
  valor_num := CASE
    WHEN NEW.valor_investimento ILIKE '%acima de R$100%' THEN 150000
    WHEN NEW.valor_investimento ILIKE '%R$50 mil a R$100%' THEN 100000
    WHEN NEW.valor_investimento ILIKE '%R$10 mil a R$50%' THEN 50000
    WHEN NEW.valor_investimento ILIKE '%até R$10%' THEN 10000
    ELSE NULL
  END;

  -- Construir observações com dados do formulário
  obs_text := '';
  IF NEW.form_name IS NOT NULL THEN
    obs_text := obs_text || NEW.form_name;
  END IF;
  IF NEW.ad_name IS NOT NULL THEN
    obs_text := obs_text || ' | Anúncio: ' || NEW.ad_name;
  END IF;
  IF NEW.adset_name IS NOT NULL THEN
    obs_text := obs_text || ' | Conjunto: ' || NEW.adset_name;
  END IF;

  -- Extrair data/hora Brasil do created_time
  created_brasil := NULL;
  IF NEW.created_time IS NOT NULL AND NEW.created_time != '' THEN
    BEGIN
      created_brasil := TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI')::text;
    EXCEPTION WHEN OTHERS THEN
      created_brasil := NULL;
    END;
  END IF;

  -- Inserir com ON CONFLICT para merge automático por email
  INSERT INTO leads (
    nome_completo, telefone, email, valor_produto, origem,
    etapa_funil, observacoes, meta_lead_id, created_time_brasil, origens
  ) VALUES (
    COALESCE(NEW.nome_completo, 'Sem nome'),
    TRIM(NEW.telefone),
    LOWER(TRIM(NEW.email)),
    valor_num,
    'meta_form',
    'Novo Lead',
    obs_text,
    NEW.id,
    created_brasil,
    '["meta_form"]'::jsonb
  )
  ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL AND email != ''
  DO UPDATE SET
    observacoes = COALESCE(leads.observacoes, '') || E'\n[Meta Form merge] ' || EXCLUDED.observacoes,
    valor_produto = COALESCE(leads.valor_produto, EXCLUDED.valor_produto),
    meta_lead_id = COALESCE(leads.meta_lead_id, EXCLUDED.meta_lead_id),
    created_time_brasil = COALESCE(leads.created_time_brasil, EXCLUDED.created_time_brasil),
    data_atualizacao = NOW(),
    origens = CASE
      WHEN leads.origens IS NULL OR leads.origens = '[]'::jsonb THEN '["meta_form"]'::jsonb
      WHEN NOT leads.origens @> '"meta_form"'::jsonb THEN leads.origens || '"meta_form"'::jsonb
      ELSE leads.origens
    END;

  RETURN NEW;
END;
$function$;
