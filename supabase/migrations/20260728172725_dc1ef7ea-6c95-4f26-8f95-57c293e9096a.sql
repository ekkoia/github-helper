
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone_created_at ON public.chat_messages (phone, created_at DESC) WHERE phone IS NOT NULL;

CREATE OR REPLACE VIEW public.lead_last_interaction AS
WITH last_msg AS (
  SELECT public.phone_key(phone) AS tkey, MAX(created_at) AS last_msg_at
  FROM public.chat_messages
  WHERE phone IS NOT NULL
  GROUP BY public.phone_key(phone)
)
SELECT
  l.id AS lead_id,
  GREATEST(COALESCE(m.last_msg_at, l.data_criacao), l.data_criacao) AS last_interaction_at,
  m.last_msg_at
FROM public.leads l
LEFT JOIN last_msg m ON m.tkey = l.telefone_key;

GRANT SELECT ON public.lead_last_interaction TO authenticated;
GRANT ALL ON public.lead_last_interaction TO service_role;
