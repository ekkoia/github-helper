-- 1. Adicionar coluna de referência para evitar duplicatas
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS meta_lead_id bigint UNIQUE;

-- 2. Criar função de sincronização
CREATE OR REPLACE FUNCTION public.sync_meta_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_observacoes text;
BEGIN
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

  -- Inserir na tabela leads
  INSERT INTO public.leads (
    nome_completo,
    telefone,
    email,
    origem,
    etapa_funil,
    observacoes,
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
    NEW.id,
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (meta_lead_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 3. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_meta_lead ON "leadsNativo_feeagro";
CREATE TRIGGER trigger_sync_meta_lead
AFTER INSERT ON "leadsNativo_feeagro"
FOR EACH ROW
EXECUTE FUNCTION sync_meta_lead_to_crm();

-- 4. Sincronizar leads existentes
INSERT INTO public.leads (
  nome_completo,
  telefone,
  email,
  origem,
  etapa_funil,
  observacoes,
  meta_lead_id,
  data_criacao
)
SELECT
  COALESCE(nome_completo, 'Não informado'),
  telefone,
  email,
  'meta_form',
  'Novo Lead',
  'Valor pretendido: ' || COALESCE(valor_investimento, 'Não informado') ||
    CASE WHEN form_name IS NOT NULL THEN chr(10) || 'Formulário: ' || form_name ELSE '' END ||
    CASE WHEN ad_name IS NOT NULL THEN chr(10) || 'Anúncio: ' || ad_name ELSE '' END ||
    CASE WHEN adset_name IS NOT NULL THEN chr(10) || 'Conjunto: ' || adset_name ELSE '' END,
  id,
  COALESCE(created_at, now())
FROM "leadsNativo_feeagro"
WHERE id NOT IN (SELECT meta_lead_id FROM leads WHERE meta_lead_id IS NOT NULL);