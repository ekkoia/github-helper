CREATE OR REPLACE FUNCTION public.upsert_window_from_inbound()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_expires timestamptz;
  v_dir text;
  v_instance text;
BEGIN
  v_dir := lower(trim(COALESCE(NEW.message_direction, '')));
  v_instance := lower(trim(COALESCE(NEW.whatsapp_instance_name, '')));

  IF v_dir <> 'inbound'
     OR v_instance <> 'meta_official'
     OR NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;

  v_phone := regexp_replace(NEW.phone, '[^0-9]', '', 'g');
  IF v_phone = '' THEN
    RETURN NEW;
  END IF;

  v_expires := COALESCE(NEW.created_at, now()) + interval '24 hours';

  INSERT INTO public.whatsapp_conversation_windows AS w
    (phone_e164, expires_at, last_inbound_at, source, meta_account_id, updated_at)
  VALUES (v_phone, v_expires, COALESCE(NEW.created_at, now()), 'inbound_message', NEW.meta_account_id, now())
  ON CONFLICT (phone_e164) DO UPDATE
    SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
        last_inbound_at = GREATEST(COALESCE(w.last_inbound_at, 'epoch'::timestamptz), EXCLUDED.last_inbound_at),
        meta_account_id = COALESCE(EXCLUDED.meta_account_id, w.meta_account_id),
        source = CASE WHEN w.source = 'meta_status' AND w.expires_at >= EXCLUDED.expires_at THEN w.source ELSE 'inbound_message' END,
        updated_at = now();

  RETURN NEW;
END;
$function$;