CREATE OR REPLACE FUNCTION public.set_leads_fds()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  dow int;
BEGIN
  IF NEW.etapa_funil IS NULL
     OR NEW.etapa_funil = 'Lead novo!'
     OR NEW.etapa_funil = 'Lead WhatsApp (não qualificado)' THEN
    dow := EXTRACT(DOW FROM (COALESCE(NEW.data_criacao, now()) AT TIME ZONE 'America/Sao_Paulo'));
    IF dow IN (0, 6) THEN
      NEW.etapa_funil := 'Leads FDS';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;