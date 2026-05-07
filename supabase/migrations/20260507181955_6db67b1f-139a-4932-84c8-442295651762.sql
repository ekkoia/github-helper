
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  valor_num NUMERIC;
  obs_text TEXT;
  created_brasil TEXT;
BEGIN
  valor_num := CASE
    WHEN NEW.valor_investimento ILIKE '%acima de R$100%' THEN 150000
    WHEN NEW.valor_investimento ILIKE '%R$50 mil a R$100%' THEN 100000
    WHEN NEW.valor_investimento ILIKE '%R$10 mil a R$50%' THEN 50000
    WHEN NEW.valor_investimento ILIKE '%até R$10%' THEN 10000
    ELSE NULL
  END;

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

  created_brasil := NULL;
  IF NEW.created_time IS NOT NULL AND NEW.created_time != '' THEN
    BEGIN
      created_brasil := TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI')::text;
    EXCEPTION WHEN OTHERS THEN
      created_brasil := NULL;
    END;
  END IF;

  INSERT INTO leads (
    nome_completo, telefone, email, valor_produto, origem,
    etapa_funil, observacoes, meta_lead_id, created_time_brasil, origens
  ) VALUES (
    COALESCE(NULLIF(TRIM(NEW.nome_completo), ''), 'Sem nome'),
    NULLIF(TRIM(NEW.telefone), ''),
    LOWER(TRIM(NEW.email)),
    valor_num,
    'meta_form',
    'Lead novo!',
    obs_text,
    NEW.id,
    created_brasil,
    '["meta_form"]'::jsonb
  )
  ON CONFLICT ((lower(trim(email)))) WHERE email IS NOT NULL AND email != ''
  DO UPDATE SET
    nome_completo = CASE
      WHEN leads.nome_completo IS NULL
        OR TRIM(leads.nome_completo) = ''
        OR leads.nome_completo = 'Sem nome'
      THEN COALESCE(NULLIF(TRIM(EXCLUDED.nome_completo), ''), leads.nome_completo)
      ELSE leads.nome_completo
    END,
    telefone = CASE
      WHEN leads.telefone IS NULL OR TRIM(leads.telefone) = ''
      THEN NULLIF(TRIM(EXCLUDED.telefone), '')
      ELSE leads.telefone
    END,
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
