
CREATE OR REPLACE VIEW public.lead_last_interaction
WITH (security_invoker = true) AS
SELECT
  l.id AS lead_id,
  GREATEST(
    COALESCE(m.last_msg_at, l.data_criacao),
    l.data_criacao
  ) AS last_interaction_at,
  m.last_msg_at
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT MAX(cm.created_at) AS last_msg_at
  FROM public.chat_messages cm
  WHERE cm.phone IS NOT NULL
    AND l.telefone_key IS NOT NULL
    AND public.phone_key(cm.phone) = l.telefone_key
) m ON true;

GRANT SELECT ON public.lead_last_interaction TO authenticated;
GRANT SELECT ON public.lead_last_interaction TO service_role;
