
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS meta_raw_payload jsonb;

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
          WHEN delivery_status = 'read' THEN 'read'
          WHEN delivery_status = 'delivered' AND v_status = 'sent' THEN 'delivered'
          ELSE v_status
        END,
        delivery_status_updated_at = COALESCE(v_ts, now()),
        failure_reason = COALESCE(v_err, failure_reason),
        meta_raw_payload = CASE
          WHEN v_status = 'failed' OR r ? 'errors' THEN r
          ELSE COALESCE(meta_raw_payload, r)
        END
    WHERE meta_message_id = v_meta_id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reprocess_webhook_events(_since timestamptz DEFAULT (now() - interval '24 hours'))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev RECORD;
  entry jsonb;
  change jsonb;
  m jsonb;
  s jsonb;
  v_meta_id text;
  v_phone text;
  v_wa_id text;
  v_type text;
  v_text text;
  v_ts timestamptz;
  v_contact_name text;
  v_meta_account_id uuid;
  v_phone_number_id text;
  v_status text;
  v_err text;
  v_exp bigint;
  v_expires timestamptz;
  v_inserted_msgs int := 0;
  v_updated_windows int := 0;
  v_status_updates int := 0;
BEGIN
  FOR ev IN
    SELECT id, payload FROM public.whatsapp_webhook_events
    WHERE created_at >= _since
    ORDER BY created_at ASC
  LOOP
    IF ev.payload IS NULL THEN CONTINUE; END IF;

    FOR entry IN SELECT jsonb_array_elements(COALESCE(ev.payload->'entry', '[]'::jsonb))
    LOOP
      FOR change IN SELECT jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb))
      LOOP
        v_phone_number_id := change->'value'->'metadata'->>'phone_number_id';
        v_meta_account_id := NULL;
        IF v_phone_number_id IS NOT NULL THEN
          SELECT id INTO v_meta_account_id FROM public.whatsapp_meta_accounts
            WHERE phone_number_id = v_phone_number_id LIMIT 1;
        END IF;

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

          IF v_meta_id IS NOT NULL AND v_phone IS NOT NULL AND v_text IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM public.chat_messages WHERE meta_message_id = v_meta_id) THEN
            INSERT INTO public.chat_messages (
              phone, nomewpp, user_message, message_type, message_direction,
              whatsapp_instance_name, meta_message_id, meta_account_id, created_at
            ) VALUES (
              v_phone, v_contact_name, v_text, 'text', 'inbound',
              'meta_official', v_meta_id, v_meta_account_id, v_ts
            );
            v_inserted_msgs := v_inserted_msgs + 1;
          END IF;

          IF v_phone IS NOT NULL THEN
            DECLARE v_p text := regexp_replace(v_phone, '[^0-9]', '', 'g'); v_e timestamptz := v_ts + interval '24 hours';
            BEGIN
              IF v_p <> '' THEN
                INSERT INTO public.whatsapp_conversation_windows AS w
                  (phone_e164, wa_id, expires_at, last_inbound_at, source, updated_at)
                VALUES (v_p, v_phone, v_e, v_ts, 'meta_inbound', now())
                ON CONFLICT (phone_e164) DO UPDATE
                  SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
                      last_inbound_at = GREATEST(COALESCE(w.last_inbound_at, 'epoch'::timestamptz), EXCLUDED.last_inbound_at),
                      wa_id = COALESCE(EXCLUDED.wa_id, w.wa_id),
                      source = 'meta_inbound',
                      updated_at = now();
                v_updated_windows := v_updated_windows + 1;
              END IF;
            END;
          END IF;
        END LOOP;

        FOR s IN SELECT jsonb_array_elements(COALESCE(change->'value'->'statuses', '[]'::jsonb))
        LOOP
          v_meta_id := s->>'id';
          v_status := s->>'status';
          v_ts := to_timestamp(NULLIF(s->>'timestamp','')::bigint);
          v_err := NULL;
          IF s ? 'errors' THEN
            v_err := COALESCE(
              s->'errors'->0->>'title',
              s->'errors'->0->>'message',
              s->'errors'->0->'error_data'->>'details'
            );
          END IF;

          IF v_meta_id IS NOT NULL AND v_status IS NOT NULL THEN
            UPDATE public.chat_messages
            SET delivery_status = CASE
                  WHEN delivery_status = 'read' THEN 'read'
                  WHEN delivery_status = 'delivered' AND v_status = 'sent' THEN 'delivered'
                  ELSE v_status END,
                delivery_status_updated_at = COALESCE(v_ts, now()),
                failure_reason = COALESCE(v_err, failure_reason),
                meta_raw_payload = CASE
                  WHEN v_status = 'failed' OR s ? 'errors' THEN s
                  ELSE COALESCE(meta_raw_payload, s)
                END
            WHERE meta_message_id = v_meta_id;
            IF FOUND THEN v_status_updates := v_status_updates + 1; END IF;
          END IF;

          v_wa_id := s->>'recipient_id';
          v_phone := regexp_replace(COALESCE(v_wa_id, ''), '[^0-9]', '', 'g');
          v_exp := NULLIF(s->'conversation'->>'expiration_timestamp', '')::bigint;
          IF v_phone <> '' AND v_exp IS NOT NULL THEN
            v_expires := to_timestamp(v_exp);
            INSERT INTO public.whatsapp_conversation_windows AS w
              (phone_e164, wa_id, expires_at, source, updated_at)
            VALUES (v_phone, v_wa_id, v_expires, 'meta_status', now())
            ON CONFLICT (phone_e164) DO UPDATE
              SET expires_at = GREATEST(w.expires_at, EXCLUDED.expires_at),
                  wa_id = COALESCE(EXCLUDED.wa_id, w.wa_id),
                  source = 'meta_status',
                  updated_at = now();
            v_updated_windows := v_updated_windows + 1;
          END IF;
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'since', _since,
    'inserted_messages', v_inserted_msgs,
    'window_upserts', v_updated_windows,
    'status_updates', v_status_updates,
    'ran_at', now()
  );
END;
$$;

UPDATE public.chat_messages cm
SET meta_raw_payload = sub.status_obj
FROM (
  SELECT DISTINCT ON (s->>'id') s->>'id' AS meta_id, s AS status_obj
  FROM public.whatsapp_webhook_events e,
       jsonb_array_elements(COALESCE(e.payload->'entry', '[]'::jsonb)) AS entry,
       jsonb_array_elements(COALESCE(entry->'changes', '[]'::jsonb)) AS change,
       jsonb_array_elements(COALESCE(change->'value'->'statuses', '[]'::jsonb)) AS s
  WHERE s ? 'errors'
  ORDER BY s->>'id', e.created_at DESC
) sub
WHERE cm.meta_message_id = sub.meta_id
  AND cm.meta_raw_payload IS NULL;
