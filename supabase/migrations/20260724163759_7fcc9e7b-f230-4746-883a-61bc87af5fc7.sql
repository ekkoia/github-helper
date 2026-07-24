
-- 1. Catálogo de tags
CREATE TABLE public.lead_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#6b7280',
  emoji TEXT,
  categoria TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tags TO authenticated;
GRANT ALL ON public.lead_tags TO service_role;

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados podem ver tags"
  ON public.lead_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admin cria tags"
  ON public.lead_tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admin edita tags"
  ON public.lead_tags FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admin exclui tags"
  ON public.lead_tags FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_lead_tags_updated_at
  BEFORE UPDATE ON public.lead_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Vínculo lead ↔ tag (N:N)
CREATE TABLE public.lead_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  atribuido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, tag_id)
);

CREATE INDEX idx_lead_tag_assignments_lead ON public.lead_tag_assignments(lead_id);
CREATE INDEX idx_lead_tag_assignments_tag ON public.lead_tag_assignments(tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_tag_assignments TO authenticated;
GRANT ALL ON public.lead_tag_assignments TO service_role;

ALTER TABLE public.lead_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Vê atribuições dos leads que o usuário enxerga (admin vê tudo; user vê os seus)
CREATE POLICY "Ver tags dos leads visíveis"
  ON public.lead_tag_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
        AND l.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "Adicionar tags em leads visíveis"
  ON public.lead_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
        AND l.responsavel_id = auth.uid()
    )
  );

CREATE POLICY "Remover tags em leads visíveis"
  ON public.lead_tag_assignments FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
        AND l.responsavel_id = auth.uid()
    )
  );

-- 3. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_tag_assignments;

-- 4. Seed de tags iniciais
INSERT INTO public.lead_tags (nome, cor, emoji, categoria, ordem) VALUES
  ('Quente',                  '#ef4444', '🔥', 'Temperatura', 1),
  ('Morno',                   '#f59e0b', '🌡️', 'Temperatura', 2),
  ('Frio',                    '#3b82f6', '❄️', 'Temperatura', 3),
  ('Alto potencial',          '#10b981', '💰', 'Sinal',       4),
  ('Atenção',                 '#eab308', '⚠️', 'Sinal',       5),
  ('Não perturbar',           '#6b7280', '🚫', 'Sinal',       6),
  ('Retornar ligação',        '#8b5cf6', '📞', 'Sinal',       7),
  ('Documentos enviados',     '#059669', '✅', 'Sinal',       8),
  ('Aguardando resposta',     '#0ea5e9', '🕐', 'Sinal',       9),
  ('Produtor rural',          '#84cc16', '👨‍🌾','Perfil',     10),
  ('Investidor PJ',           '#1e40af', '🏢', 'Perfil',      11),
  ('Primeira vez investindo', '#a855f7', '🎓', 'Perfil',      12);
