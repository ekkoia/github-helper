-- Tabela de leads com todos os campos solicitados
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Identificação
  nome_completo TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('Produtor', 'Corretor', 'Armazém')),
  protocolo_atendimento TEXT,
  
  -- Negociação
  intencao TEXT CHECK (intencao IN ('Comprar', 'Vender')),
  tipo_grao TEXT CHECK (tipo_grao IN ('Soja', 'Milho')),
  volume TEXT,
  valor_produto DECIMAL(10, 2),
  
  -- Localização
  cidade TEXT,
  uf TEXT,
  localizacao_embarque TEXT,
  distancia_km DECIMAL(10, 2),
  sentido TEXT CHECK (sentido IN ('Norte', 'Sul', 'Leste', 'Oeste')),
  estrada_terra_km DECIMAL(10, 2),
  
  -- Dados Técnicos
  armazenamento TEXT CHECK (armazenamento IN ('Silo Bolsa', 'Silo Metálico', 'Colheitadeira', 'Outro')),
  qualidade TEXT,
  tem_royalties TEXT CHECK (tem_royalties IN ('Sim', 'Não', 'Não informado')),
  percentual_royalties DECIMAL(5, 2),
  
  -- Gestão
  etapa_funil TEXT NOT NULL DEFAULT 'Novo Lead' CHECK (etapa_funil IN (
    'Novo Lead',
    'Em atendimento IA',
    'Atendimento Humano',
    'Reunião Agendada',
    'Proposta Enviada',
    'Ganho',
    'Perdido',
    'Sem interesse',
    'Ghost',
    'Nutrir'
  )),
  observacoes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso público (você pode ajustar depois)
CREATE POLICY "Permitir acesso completo a leads"
  ON public.leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_leads_etapa_funil ON public.leads(etapa_funil);
CREATE INDEX idx_leads_perfil ON public.leads(perfil);
CREATE INDEX idx_leads_intencao ON public.leads(intencao);
CREATE INDEX idx_leads_data_criacao ON public.leads(data_criacao DESC);