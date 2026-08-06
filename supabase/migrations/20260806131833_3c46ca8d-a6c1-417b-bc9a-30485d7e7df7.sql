CREATE TABLE public.campanhas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  template_name text,
  template_language text NOT NULL DEFAULT 'pt_BR',
  criado_por uuid NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  total_publico integer NOT NULL DEFAULT 0,
  total_enviado integer NOT NULL DEFAULT 0,
  total_falha integer NOT NULL DEFAULT 0,
  total_bloqueado integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas TO authenticated;
GRANT ALL ON public.campanhas TO service_role;

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campanhas visiveis para dono, admin e sdr"
ON public.campanhas FOR SELECT TO authenticated
USING (
  criado_por = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'sdr')
);

CREATE POLICY "Usuarios criam suas campanhas"
ON public.campanhas FOR INSERT TO authenticated
WITH CHECK (criado_por = auth.uid());

CREATE POLICY "Dono ou admin atualiza campanhas"
ON public.campanhas FOR UPDATE TO authenticated
USING (criado_por = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (criado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Dono ou admin remove campanhas"
ON public.campanhas FOR DELETE TO authenticated
USING (criado_por = auth.uid() OR public.is_admin(auth.uid()));

CREATE TRIGGER update_campanhas_updated_at
BEFORE UPDATE ON public.campanhas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campanha_destinatarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  lead_id uuid,
  nome text,
  telefone text,
  responsavel_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  meta_message_id text,
  erro text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_campanha_destinatarios_campanha ON public.campanha_destinatarios(campanha_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_destinatarios TO authenticated;
GRANT ALL ON public.campanha_destinatarios TO service_role;

ALTER TABLE public.campanha_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Destinatarios visiveis conforme campanha"
ON public.campanha_destinatarios FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campanhas c
    WHERE c.id = campanha_id
      AND (c.criado_por = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'sdr'))
  )
);

CREATE POLICY "Destinatarios inseridos pelo dono da campanha"
ON public.campanha_destinatarios FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campanhas c
    WHERE c.id = campanha_id
      AND (c.criado_por = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Destinatarios atualizados pelo dono da campanha"
ON public.campanha_destinatarios FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campanhas c
    WHERE c.id = campanha_id
      AND (c.criado_por = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campanhas c
    WHERE c.id = campanha_id
      AND (c.criado_por = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Destinatarios removidos pelo dono da campanha"
ON public.campanha_destinatarios FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.campanhas c
    WHERE c.id = campanha_id
      AND (c.criado_por = auth.uid() OR public.is_admin(auth.uid()))
  )
);