
-- 1. Table
CREATE TABLE public.whatsapp_conversation_windows (
  phone_e164 text PRIMARY KEY,
  wa_id text,
  expires_at timestamptz,
  last_inbound_at timestamptz,
  source text NOT NULL DEFAULT 'inbound_message',
  meta_account_id uuid REFERENCES public.whatsapp_meta_accounts(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wcw_expires_at ON public.whatsapp_conversation_windows(expires_at);

GRANT SELECT ON public.whatsapp_conversation_windows TO authenticated;
GRANT ALL ON public.whatsapp_conversation_windows TO service_role;

ALTER TABLE public.whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_windows"
  ON public.whatsapp_conversation_windows
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Trigger function: parse Meta status webhook payloads
CREATE OR REPLACE FUNCTION public.upsert_window_from_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_phone text;
  v_wa_id text;
  v_exp bigint;
  v_expires timestamptz;
BEGIN
  IF NEW.payload IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT jsonb_array_elements(
      COALESCE(change->'value'->'statuses', '[]'::jsonb)
    )
    FROM jsonb_array_elements(COALESCE(NEW.payload->'entry', '[]'::jsonb)) AS entry,
         jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb)) AS change
  LOOP
    v_wa_id := r->>'recipient_id';
    v_phone := regexp_replace(COALESCE(v_wa_id, ''), '[^0-9]', '', 'g');
    v_exp := NULLIF(r->'conversation'->>'expiration_timestamp', '')::bigint;

    IF v_phone = '' OR v_exp IS NULL THEN
      CONTINUE;
    END IF;

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

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_window_from_webhook
AFTER INSERT ON public.whatsapp_webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.upsert_window_from_webhook();

-- 3. Trigger function: fallback from inbound chat_messages
CREATE OR REPLACE FUNCTION public.upsert_window_from_inbound()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_expires timestamptz;
BEGIN
  IF NEW.message_direction IS DISTINCT FROM 'inbound'
     OR NEW.whatsapp_instance_name IS DISTINCT FROM 'meta_official'
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
$$;

CREATE TRIGGER trg_window_from_inbound
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.upsert_window_from_inbound();

-- 4. Backfill from existing inbound messages
INSERT INTO public.whatsapp_conversation_windows (phone_e164, expires_at, last_inbound_at, source, updated_at)
SELECT
  regexp_replace(phone, '[^0-9]', '', 'g') AS phone_e164,
  MAX(created_at) + interval '24 hours' AS expires_at,
  MAX(created_at) AS last_inbound_at,
  'inbound_message',
  now()
FROM public.chat_messages
WHERE message_direction = 'inbound'
  AND whatsapp_instance_name = 'meta_official'
  AND phone IS NOT NULL
  AND regexp_replace(phone, '[^0-9]', '', 'g') <> ''
GROUP BY regexp_replace(phone, '[^0-9]', '', 'g')
ON CONFLICT (phone_e164) DO NOTHING;
