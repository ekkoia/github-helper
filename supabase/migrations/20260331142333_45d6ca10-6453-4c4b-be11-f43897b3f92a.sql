
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS alerta_sem_contato_enviado boolean DEFAULT false;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
