-- Atualizar função de sincronização para incluir valor_produto
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_observacoes text;
  lead_valor_produto numeric;
BEGIN
  -- Converter valor_investimento para numérico
  CASE NEW.valor_investimento
    WHEN 'até R$10 mil' THEN lead_valor_produto := 10000;
    WHEN 'de R$10 mil a R$50 mil' THEN lead_valor_produto := 30000;
    WHEN 'de R$50 mil a R$100 mil' THEN lead_valor_produto := 75000;
    WHEN 'acima de R$100 mil' THEN lead_valor_produto := 100000;
    ELSE lead_valor_produto := NULL;
  END CASE;

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

  -- Inserir na tabela leads com valor_produto
  INSERT INTO public.leads (
    nome_completo,
    telefone,
    email,
    origem,
    etapa_funil,
    observacoes,
    valor_produto,
    meta_lead_id,
    data_criacao
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
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (meta_lead_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Atualizar leads existentes que já foram sincronizados
UPDATE public.leads
SET valor_produto = CASE
    WHEN observacoes LIKE '%até R$10 mil%' THEN 10000
    WHEN observacoes LIKE '%de R$10 mil a R$50 mil%' THEN 30000
    WHEN observacoes LIKE '%de R$50 mil a R$100 mil%' THEN 75000
    WHEN observacoes LIKE '%acima de R$100 mil%' THEN 100000
    ELSE valor_produto
  END
WHERE origem = 'meta_form' AND valor_produto IS NULL;