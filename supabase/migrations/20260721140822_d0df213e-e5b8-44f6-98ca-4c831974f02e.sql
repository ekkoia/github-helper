
-- Add delivery status tracking to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS meta_message_id text,
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS delivery_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

CREATE INDEX IF NOT EXISTS idx_chat_messages_meta_message_id
  ON public.chat_messages (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

-- Trigger function: parse webhook status events and update chat_messages
CREATE OR REPLACE FUNCTION public.apply_meta_status_to_chat_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_meta_id text;
  v_status text;
  v_err text;
  v_ts timestamptz;
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
    v_meta_id := r->>'id';
    v_status := r->>'status';
    v_ts := to_timestamp(NULLIF(r->>'timestamp','')::bigint);
    v_err := NULL;
    IF r ? 'errors' THEN
      v_err := COALESCE(
        r->'errors'->0->>'title',
        r->'errors'->0->>'message',
        r->'errors'->0->'error_data'->>'details'
      );
    END IF;

    IF v_meta_id IS NULL OR v_status IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.chat_messages
    SET delivery_status = CASE
          -- Não regride: read > delivered > sent > failed
          WHEN delivery_status = 'read' THEN 'read'
          WHEN delivery_status = 'delivered' AND v_status = 'sent' THEN 'delivered'
          ELSE v_status
        END,
        delivery_status_updated_at = COALESCE(v_ts, now()),
        failure_reason = COALESCE(v_err, failure_reason)
    WHERE meta_message_id = v_meta_id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_meta_status_to_chat_messages ON public.whatsapp_webhook_events;
CREATE TRIGGER trg_apply_meta_status_to_chat_messages
AFTER INSERT ON public.whatsapp_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.apply_meta_status_to_chat_messages();
