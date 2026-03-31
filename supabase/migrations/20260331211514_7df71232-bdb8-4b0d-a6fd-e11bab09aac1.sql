-- Adicionar campo data_primeiro_contato
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_primeiro_contato timestamptz;

-- Criar função do trigger
CREATE OR REPLACE FUNCTION mark_lead_contacted_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.etapa_funil = 'Lead novo!' 
     AND NEW.etapa_funil IS DISTINCT FROM 'Lead novo!' THEN
    NEW.alerta_sem_contato_enviado := true;
    IF NEW.data_primeiro_contato IS NULL THEN
      NEW.data_primeiro_contato := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE UPDATE
CREATE TRIGGER trg_lead_contacted_on_stage_change
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION mark_lead_contacted_on_stage_change();