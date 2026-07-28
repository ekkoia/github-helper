
INSERT INTO public.funil_etapas (nome, cor, ordem, ativo)
VALUES ('Onboarding', '#06b6d4', 18, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_tags (nome, cor, emoji, categoria, ordem, ativo)
VALUES ('Kyc-Pend', '#f59e0b', '📋', 'Onboarding', 100, true)
ON CONFLICT DO NOTHING;
