
-- Adicionar coluna origens
ALTER TABLE leads ADD COLUMN origens jsonb DEFAULT '[]'::jsonb;

-- Trigger para inicializar origens em novos leads
CREATE OR REPLACE FUNCTION init_lead_origens()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origens IS NULL OR NEW.origens = '[]'::jsonb THEN
    IF NEW.origem IS NOT NULL AND NEW.origem != '' THEN
      NEW.origens := jsonb_build_array(NEW.origem);
    ELSE
      NEW.origens := '[]'::jsonb;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_origens
BEFORE INSERT ON leads
FOR EACH ROW EXECUTE FUNCTION init_lead_origens();

-- Atualizar sync_meta_lead_to_crm para adicionar origem ao array origens no merge
CREATE OR REPLACE FUNCTION sync_meta_lead_to_crm()
RETURNS TRIGGER AS $$
DECLARE
  lead_exists RECORD;
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
  IF NEW.created_time IS NOT NULL THEN
    BEGIN
      created_brasil := (NEW.created_time::timestamptz AT TIME ZONE 'America/Sao_Paulo')::text;
    EXCEPTION WHEN OTHERS THEN
      created_brasil := NULL;
    END;
  END IF;

  -- Verificar se já existe lead com mesmo email ou telefone
  SELECT * INTO lead_exists FROM leads
  WHERE (email IS NOT NULL AND email = LOWER(TRIM(NEW.email)))
     OR (telefone IS NOT NULL AND telefone = TRIM(NEW.telefone))
  ORDER BY data_criacao ASC
  LIMIT 1;

  IF lead_exists IS NOT NULL THEN
    -- Lead já existe: fazer merge (atualizar)
    UPDATE leads SET
      observacoes = COALESCE(lead_exists.observacoes, '') || E'\n[Desduplicação automática] ' || obs_text,
      valor_produto = COALESCE(lead_exists.valor_produto, valor_num),
      meta_lead_id = COALESCE(lead_exists.meta_lead_id, NEW.id),
      data_atualizacao = NOW(),
      origens = CASE
        WHEN lead_exists.origens IS NULL OR lead_exists.origens = '[]'::jsonb THEN '["meta_form"]'::jsonb
        WHEN NOT lead_exists.origens @> '"meta_form"'::jsonb THEN lead_exists.origens || '"meta_form"'::jsonb
        ELSE lead_exists.origens
      END
    WHERE id = lead_exists.id;
  ELSE
    -- Lead novo: inserir
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
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migrar dados existentes: popular origens com a origem atual
UPDATE leads SET origens = jsonb_build_array(origem)
WHERE origem IS NOT NULL AND origem != ''
  AND (origens IS NULL OR origens = '[]'::jsonb);
