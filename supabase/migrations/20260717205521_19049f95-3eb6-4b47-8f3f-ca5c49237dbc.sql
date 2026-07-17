
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS template_fds_enviado_em timestamptz;

INSERT INTO public.funil_etapas (nome, cor, ordem, ativo)
SELECT 'Leads FDS', '#f97316', 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.funil_etapas WHERE nome = 'Leads FDS');

CREATE OR REPLACE FUNCTION public.set_leads_fds()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  dow int;
BEGIN
  IF NEW.etapa_funil IS NULL OR NEW.etapa_funil = 'Lead novo!' THEN
    dow := EXTRACT(DOW FROM (COALESCE(NEW.data_criacao, now()) AT TIME ZONE 'America/Sao_Paulo'));
    IF dow IN (0, 6) THEN
      NEW.etapa_funil := 'Leads FDS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_leads_fds ON public.leads;
CREATE TRIGGER trg_set_leads_fds
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_leads_fds();
