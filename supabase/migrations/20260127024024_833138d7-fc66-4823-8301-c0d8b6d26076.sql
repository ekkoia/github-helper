-- =============================================
-- CRM IMACULADA - MIGRAÇÃO COMPLETA
-- =============================================

-- 1. CRIAR ENUM PARA ROLES
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'global');

-- 2. CRIAR TABELAS

-- 2.1 Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo TEXT,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.2 User Roles (separado do profile por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 2.3 Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  perfil TEXT DEFAULT 'Produtor',
  etapa_funil TEXT DEFAULT 'Novo Lead',
  protocolo_atendimento TEXT,
  intencao TEXT,
  tipo_grao TEXT,
  volume TEXT,
  valor_produto NUMERIC,
  cidade TEXT,
  uf TEXT,
  localizacao_embarque TEXT,
  distancia_km NUMERIC,
  sentido TEXT,
  estrada_terra_km NUMERIC,
  armazenamento TEXT,
  qualidade TEXT,
  tem_royalties BOOLEAN DEFAULT false,
  percentual_royalties NUMERIC,
  observacoes TEXT,
  responsavel_id UUID REFERENCES auth.users(id),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.4 User Activities (log de atividades)
CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.5 User Preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'system',
  default_view TEXT DEFAULT 'tabela',
  density TEXT DEFAULT 'comfortable',
  email_notifications BOOLEAN DEFAULT true,
  app_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily',
  inactive_lead_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.6 Pending Invites
CREATE TABLE public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nome_completo TEXT,
  telefone TEXT,
  role app_role DEFAULT 'user',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.7 Funil Etapas
CREATE TABLE public.funil_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2.8 Lead Custom Fields
CREATE TABLE public.lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  label TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'text',
  obrigatorio BOOLEAN DEFAULT false,
  opcoes JSONB,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funil_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_custom_fields ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR FUNÇÃO AUXILIAR has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é admin (admin ou global)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'global')
  )
$$;

-- 5. POLÍTICAS RLS

-- 5.1 Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5.2 User Roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5.3 Leads (todos autenticados podem CRUD)
CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (true);

-- 5.4 User Activities
CREATE POLICY "Users can view own activities"
  ON public.user_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON public.user_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activities"
  ON public.user_activities FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5.5 User Preferences
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5.6 Pending Invites (apenas admins)
CREATE POLICY "Admins can manage invites"
  ON public.pending_invites FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5.7 Funil Etapas
CREATE POLICY "Authenticated users can view etapas"
  ON public.funil_etapas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage etapas"
  ON public.funil_etapas FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5.8 Lead Custom Fields
CREATE POLICY "Authenticated users can view custom fields"
  ON public.lead_custom_fields FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custom fields"
  ON public.lead_custom_fields FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. TRIGGERS E FUNCTIONS

-- 6.1 Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6.2 Função para atualizar data_atualizacao em leads
CREATE OR REPLACE FUNCTION public.update_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_data_atualizacao
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_updated_at();

-- 6.3 Função para criar profile automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Criar role padrão 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Criar preferências padrão
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger no auth.users (precisa ser criado no schema auth)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. DADOS INICIAIS - ETAPAS DO FUNIL
INSERT INTO public.funil_etapas (nome, cor, ordem) VALUES
  ('Novo Lead', '#6366f1', 1),
  ('Em atendimento IA', '#8b5cf6', 2),
  ('Atendimento Humano', '#a855f7', 3),
  ('Reunião Agendada', '#3b82f6', 4),
  ('Proposta Enviada', '#0ea5e9', 5),
  ('Ganho', '#22c55e', 6),
  ('Perdido', '#ef4444', 7),
  ('Sem interesse', '#f97316', 8),
  ('Ghost', '#64748b', 9),
  ('Nutrir', '#eab308', 10),
  ('Parceiro', '#14b8a6', 11);

-- 8. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_leads_etapa_funil ON public.leads(etapa_funil);
CREATE INDEX idx_leads_data_criacao ON public.leads(data_criacao);
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at);
CREATE INDEX idx_funil_etapas_ordem ON public.funil_etapas(ordem);