
-- 1) push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

-- 2) user_preferences — novas colunas
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS push_new_lead boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_new_message boolean NOT NULL DEFAULT true;

-- 3) Função utilitária para chamar a edge function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  _user_id uuid,
  _title text,
  _body text,
  _url text,
  _tag text,
  _kind text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := 'https://omilhfohvstqsonhyuxp.supabase.co/functions/v1/send-push-notification';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9taWxoZm9odnN0cXNvbmh5dXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODIwNDcsImV4cCI6MjA4NDc1ODA0N30.q-eehykU4N_lfKiYvjgn_QepEGu_6aRQpQSl1myIvCA';
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body := jsonb_build_object(
      'user_id', _user_id,
      'title', _title,
      'body', _body,
      'url', _url,
      'tag', _tag,
      'kind', _kind
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- não falha a operação principal se push falhar
  NULL;
END;
$$;

-- 4) Trigger para novo lead atribuído
CREATE OR REPLACE FUNCTION public.notify_lead_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF NEW.responsavel_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.responsavel_id IS NOT DISTINCT FROM NEW.responsavel_id THEN
    RETURN NEW;
  END IF;

  v_title := 'Novo lead atribuído';
  v_body := COALESCE(NULLIF(TRIM(NEW.nome_completo), ''), 'Sem nome')
            || CASE WHEN NEW.telefone IS NOT NULL AND NEW.telefone <> ''
                 THEN ' • ' || NEW.telefone ELSE '' END;

  PERFORM public.send_push_notification(
    NEW.responsavel_id,
    v_title,
    v_body,
    '/leads?lead=' || NEW.id::text,
    'lead:' || NEW.id::text,
    'new_lead'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_assigned ON public.leads;
CREATE TRIGGER trg_notify_lead_assigned
  AFTER INSERT OR UPDATE OF responsavel_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_assigned();

-- 5) Trigger para nova mensagem inbound do WhatsApp
CREATE OR REPLACE FUNCTION public.notify_new_inbound_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_key text;
  v_lead RECORD;
  v_preview text;
BEGIN
  IF lower(coalesce(NEW.message_direction,'')) <> 'inbound' THEN
    RETURN NEW;
  END IF;
  IF NEW.phone IS NULL OR trim(NEW.phone) = '' THEN
    RETURN NEW;
  END IF;

  v_phone_key := public.phone_key(NEW.phone);
  IF v_phone_key IS NULL THEN RETURN NEW; END IF;

  SELECT id, nome_completo, telefone, responsavel_id
    INTO v_lead
  FROM public.leads
  WHERE telefone_key = v_phone_key
    AND responsavel_id IS NOT NULL
  ORDER BY data_criacao ASC
  LIMIT 1;

  IF NOT FOUND OR v_lead.responsavel_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_preview := COALESCE(
    NULLIF(TRIM(NEW.user_message), ''),
    CASE
      WHEN NEW.media_type = 'image' THEN '📷 Imagem'
      WHEN NEW.media_type = 'audio' THEN '🎤 Áudio'
      WHEN NEW.media_type = 'video' THEN '🎥 Vídeo'
      WHEN NEW.media_type = 'document' THEN '📄 ' || COALESCE(NEW.media_filename, 'Documento')
      ELSE 'Nova mensagem'
    END
  );

  IF length(v_preview) > 120 THEN
    v_preview := substr(v_preview, 1, 117) || '...';
  END IF;

  PERFORM public.send_push_notification(
    v_lead.responsavel_id,
    COALESCE(NULLIF(TRIM(v_lead.nome_completo), ''), 'Nova mensagem'),
    v_preview,
    '/chat?phone=' || COALESCE(v_lead.telefone, NEW.phone),
    'chat:' || v_phone_key,
    'new_message'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_inbound_message ON public.chat_messages;
CREATE TRIGGER trg_notify_new_inbound_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_inbound_message();
