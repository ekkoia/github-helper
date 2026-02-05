-- Adicionar coluna timestamp para horário Brasil
ALTER TABLE leads ADD COLUMN created_time_brasil timestamp with time zone;

-- Popular dados existentes convertendo o formato texto
UPDATE leads l
SET created_time_brasil = TO_TIMESTAMP(
  lf.created_time, 
  'DD/MM/YYYY - HH24:MI'
) AT TIME ZONE 'America/Sao_Paulo'
FROM "leadsNativo_feeagro" lf
WHERE l.meta_lead_id = lf.id
  AND lf.created_time IS NOT NULL
  AND lf.created_time != '';

-- Atualizar trigger para incluir created_time_brasil
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lead_observacoes text;
  lead_valor_produto numeric;
  lead_created_time_brasil timestamp with time zone;
BEGIN
  -- Converter valor_investimento para numérico
  CASE NEW.valor_investimento
    WHEN 'até R$10 mil' THEN lead_valor_produto := 10000;
    WHEN 'de R$10 mil a R$50 mil' THEN lead_valor_produto := 30000;
    WHEN 'de R$50 mil a R$100 mil' THEN lead_valor_produto := 75000;
    WHEN 'acima de R$100 mil' THEN lead_valor_produto := 100000;
    ELSE lead_valor_produto := NULL;
  END CASE;

  -- Converter created_time para timestamp com timezone Brasil
  IF NEW.created_time IS NOT NULL AND NEW.created_time != '' THEN
    lead_created_time_brasil := TO_TIMESTAMP(NEW.created_time, 'DD/MM/YYYY - HH24:MI') AT TIME ZONE 'America/Sao_Paulo';
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

  -- Inserir na tabela leads com valor_produto e created_time_brasil
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
  
  RETURN NEW;
END;
$function$;