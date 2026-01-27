-- Tabela de preferências dos usuários
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  default_view TEXT DEFAULT 'tabela' CHECK (default_view IN ('tabela', 'kanban')),
  density TEXT DEFAULT 'comfortable' CHECK (density IN ('compact', 'comfortable', 'spacious')),
  email_notifications BOOLEAN DEFAULT true,
  app_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  inactive_lead_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS para user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de etapas do funil customizadas (apenas admins podem editar)
CREATE TABLE IF NOT EXISTS public.funil_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para funil_etapas
ALTER TABLE public.funil_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active etapas"
  ON public.funil_etapas FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can insert etapas"
  ON public.funil_etapas FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'global'::app_role)
  );

CREATE POLICY "Admins can update etapas"
  ON public.funil_etapas FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'global'::app_role)
  );

CREATE POLICY "Admins can delete etapas"
  ON public.funil_etapas FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'global'::app_role)
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_funil_etapas_updated_at
  BEFORE UPDATE ON public.funil_etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir etapas padrão
INSERT INTO public.funil_etapas (nome, cor, ordem) VALUES
  ('Novo Lead', '#10b981', 1),
  ('Em atendimento IA', '#3b82f6', 2),
  ('Atendimento Humano', '#8b5cf6', 3),
  ('Reunião Agendada', '#f59e0b', 4),
  ('Proposta Enviada', '#eab308', 5),
  ('Ganho', '#22c55e', 6),
  ('Perdido', '#ef4444', 7),
  ('Sem interesse', '#64748b', 8),
  ('Ghost', '#71717a', 9),
  ('Nutrir', '#06b6d4', 10)
ON CONFLICT (nome) DO NOTHING;

-- Tabela de campos customizados para leads (apenas admins)
CREATE TABLE IF NOT EXISTS public.lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('text', 'number', 'select', 'date', 'boolean')),
  obrigatorio BOOLEAN DEFAULT false,
  opcoes JSONB NULL, -- Para campos do tipo select
  ordem INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(nome)
);

-- RLS para lead_custom_fields
ALTER TABLE public.lead_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active custom fields"
  ON public.lead_custom_fields FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can manage custom fields"
  ON public.lead_custom_fields FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'global'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'global'::app_role)
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_custom_fields_updated_at
  BEFORE UPDATE ON public.lead_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.user_preferences IS 'Preferências personalizadas de cada usuário';
COMMENT ON TABLE public.funil_etapas IS 'Etapas customizadas do funil de vendas';
COMMENT ON TABLE public.lead_custom_fields IS 'Campos customizados para leads (gerenciado por admins)';