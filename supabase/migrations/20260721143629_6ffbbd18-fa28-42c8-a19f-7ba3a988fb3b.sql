
-- 1) Estende upsert_window_from_webhook para abrir janela em mensagens inbound
CREATE OR REPLACE FUNCTION public.upsert_window_from_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r jsonb;
  m jsonb;
  v_phone text;
  v_wa_id text;
  v_exp bigint;
  v_expires timestamptz;
  v_msg_ts timestamptz;
BEGIN
  IF NEW.payload IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT jsonb_array_elements(COALESCE(change->'value'->'statuses', '[]'::jsonb))
    FROM jsonb_array_elements(COALESCE(NEW.payload->'entry', '[]'::jsonb)) AS entry,
         jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb)) AS change
  LOOP
    v_wa_id := r->>'recipient_id';
    v_phone := regexp_replace(COALESCE(v_wa_id, ''), '[^0-9]', '', 'g');
    v_exp := NULLIF(r->'conversation'->>'expiration_timestamp', '')::bigint;
    IF v_phone = '' OR v_exp IS NULL THEN CONTINUE; END IF;
    v_expires := to_timestamp(v_exp);

    INSERT INTO public.whatsapp_conversation_windows AS w
      (phone_e164, wa_id, expires_at, source, updated_at)
    VALUES (v_phone, v_wa_id, v_expires, 'meta_status', now())
    ON CONFLICT (phone_e164) DO UPDATE
      SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
          wa_id = COALESCE(EXCLUDED.wa_id, w.wa_id),
          source = 'meta_status',
          updated_at = now();
  END LOOP;

  FOR m IN
    SELECT jsonb_array_elements(COALESCE(change->'value'->'messages', '[]'::jsonb))
    FROM jsonb_array_elements(COALESCE(NEW.payload->'entry', '[]'::jsonb)) AS entry,
         jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb)) AS change
  LOOP
    v_wa_id := m->>'from';
    v_phone := regexp_replace(COALESCE(v_wa_id, ''), '[^0-9]', '', 'g');
    v_exp := NULLIF(m->>'timestamp', '')::bigint;
    IF v_phone = '' THEN CONTINUE; END IF;
    v_msg_ts := COALESCE(to_timestamp(v_exp), now());
    v_expires := v_msg_ts + interval '24 hours';

    INSERT INTO public.whatsapp_conversation_windows AS w
      (phone_e164, wa_id, expires_at, last_inbound_at, source, updated_at)
    VALUES (v_phone, v_wa_id, v_expires, v_msg_ts, 'meta_inbound', now())
    ON CONFLICT (phone_e164) DO UPDATE
      SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
          last_inbound_at = GREATEST(COALESCE(w.last_inbound_at, 'epoch'::timestamptz), EXCLUDED.last_inbound_at),
          wa_id = COALESCE(EXCLUDED.wa_id, w.wa_id),
          source = 'meta_inbound',
          updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 2) Persiste inbound (text/button/interactive) em chat_messages
CREATE OR REPLACE FUNCTION public.insert_inbound_from_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  m jsonb;
  entry jsonb;
  change jsonb;
  v_meta_id text;
  v_phone text;
  v_type text;
  v_text text;
  v_ts timestamptz;
  v_contact_name text;
  v_meta_account_id uuid;
  v_phone_number_id text;
BEGIN
  IF NEW.payload IS NULL THEN RETURN NEW; END IF;

  FOR entry IN SELECT jsonb_array_elements(COALESCE(NEW.payload->'entry', '[]'::jsonb))
  LOOP
    FOR change IN SELECT jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb))
    LOOP
      v_phone_number_id := change->'value'->'metadata'->>'phone_number_id';
      SELECT id INTO v_meta_account_id FROM public.whatsapp_meta_accounts
        WHERE phone_number_id = v_phone_number_id LIMIT 1;

      FOR m IN SELECT jsonb_array_elements(COALESCE(change->'value'->'messages', '[]'::jsonb))
      LOOP
        v_meta_id := m->>'id';
        v_phone := m->>'from';
        v_type := m->>'type';
        v_ts := COALESCE(to_timestamp(NULLIF(m->>'timestamp','')::bigint), now());
        v_contact_name := change->'value'->'contacts'->0->'profile'->>'name';

        v_text := NULL;
        IF v_type = 'text' THEN
          v_text := m->'text'->>'body';
        ELSIF v_type = 'button' THEN
          v_text := COALESCE(m->'button'->>'text', m->'button'->>'payload');
        ELSIF v_type = 'interactive' THEN
          v_text := COALESCE(
            m->'interactive'->'button_reply'->>'title',
            m->'interactive'->'list_reply'->>'title',
            m->'interactive'->'button_reply'->>'id',
            m->'interactive'->'list_reply'->>'id'
          );
        END IF;

        IF v_meta_id IS NULL OR v_phone IS NULL OR v_text IS NULL THEN CONTINUE; END IF;
        IF EXISTS (SELECT 1 FROM public.chat_messages WHERE meta_message_id = v_meta_id) THEN CONTINUE; END IF;

        INSERT INTO public.chat_messages (
          phone, nomewpp, user_message, message_type, message_direction,
          whatsapp_instance_name, meta_message_id, meta_account_id, created_at
        ) VALUES (
          v_phone, v_contact_name, v_text, 'text', 'inbound',
          'meta_official', v_meta_id, v_meta_account_id, v_ts
        );
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_insert_inbound_from_webhook ON public.whatsapp_webhook_events;
CREATE TRIGGER trg_insert_inbound_from_webhook
  AFTER INSERT ON public.whatsapp_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.insert_inbound_from_webhook();

-- 3) Backfill mensagens inbound (últimos 7 dias)
INSERT INTO public.chat_messages (
  phone, nomewpp, user_message, message_type, message_direction,
  whatsapp_instance_name, meta_message_id, meta_account_id, created_at
)
SELECT
  m->>'from',
  change->'value'->'contacts'->0->'profile'->>'name',
  CASE m->>'type'
    WHEN 'text' THEN m->'text'->>'body'
    WHEN 'button' THEN COALESCE(m->'button'->>'text', m->'button'->>'payload')
    WHEN 'interactive' THEN COALESCE(
      m->'interactive'->'button_reply'->>'title',
      m->'interactive'->'list_reply'->>'title')
  END,
  'text', 'inbound', 'meta_official',
  m->>'id',
  (SELECT id FROM public.whatsapp_meta_accounts
    WHERE phone_number_id = change->'value'->'metadata'->>'phone_number_id' LIMIT 1),
  COALESCE(to_timestamp(NULLIF(m->>'timestamp','')::bigint), e.created_at)
FROM public.whatsapp_webhook_events e,
     jsonb_array_elements(COALESCE(e.payload->'entry','[]'::jsonb)) AS entry,
     jsonb_array_elements(COALESCE(entry->'changes','[]'::jsonb)) AS change,
     jsonb_array_elements(COALESCE(change->'value'->'messages','[]'::jsonb)) AS m
WHERE e.created_at > now() - interval '7 days'
  AND m->>'type' IN ('text','button','interactive')
  AND m->>'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.chat_messages c WHERE c.meta_message_id = m->>'id')
  AND CASE m->>'type'
    WHEN 'text' THEN m->'text'->>'body'
    WHEN 'button' THEN COALESCE(m->'button'->>'text', m->'button'->>'payload')
    WHEN 'interactive' THEN COALESCE(
      m->'interactive'->'button_reply'->>'title',
      m->'interactive'->'list_reply'->>'title')
  END IS NOT NULL;

-- 4) Backfill janelas — agregando por phone_e164 para não violar ON CONFLICT
WITH inbound AS (
  SELECT
    regexp_replace(m->>'from', '[^0-9]', '', 'g') AS phone_e164,
    max(m->>'from') AS wa_id,
    max(COALESCE(to_timestamp(NULLIF(m->>'timestamp','')::bigint), e.created_at)) AS last_inbound_at
  FROM public.whatsapp_webhook_events e,
       jsonb_array_elements(COALESCE(e.payload->'entry','[]'::jsonb)) AS entry,
       jsonb_array_elements(COALESCE(entry->'changes','[]'::jsonb)) AS change,
       jsonb_array_elements(COALESCE(change->'value'->'messages','[]'::jsonb)) AS m
  WHERE e.created_at > now() - interval '7 days'
    AND (m->>'from') IS NOT NULL
  GROUP BY 1
)
INSERT INTO public.whatsapp_conversation_windows AS w
  (phone_e164, wa_id, expires_at, last_inbound_at, source, updated_at)
SELECT phone_e164, wa_id, last_inbound_at + interval '24 hours', last_inbound_at, 'meta_inbound', now()
FROM inbound
WHERE phone_e164 <> ''
ON CONFLICT (phone_e164) DO UPDATE
  SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
      last_inbound_at = GREATEST(COALESCE(w.last_inbound_at,'epoch'::timestamptz), EXCLUDED.last_inbound_at),
      wa_id = COALESCE(EXCLUDED.wa_id, w.wa_id),
      source = 'meta_inbound',
      updated_at = now();
