
-- Tabela de configuração: quais usuários participam de cada fila
CREATE TABLE public.auto_assign_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  faixa text NOT NULL CHECK (faixa IN ('ate_10k', 'acima_10k')),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, faixa)
);

-- Tabela de estado do round-robin
CREATE TABLE public.auto_assign_state (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faixa text NOT NULL UNIQUE CHECK (faixa IN ('ate_10k', 'acima_10k')),
  last_assigned_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Inicializar estado para ambas as faixas
INSERT INTO public.auto_assign_state (faixa, last_assigned_order) VALUES
  ('ate_10k', 0),
  ('acima_10k', 0);

-- RLS para auto_assign_config
ALTER TABLE public.auto_assign_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto_assign_config"
  ON public.auto_assign_config
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view auto_assign_config"
  ON public.auto_assign_config
  FOR SELECT
  USING (true);

-- RLS para auto_assign_state
ALTER TABLE public.auto_assign_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto_assign_state"
  ON public.auto_assign_state
  FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view auto_assign_state"
  ON public.auto_assign_state
  FOR SELECT
  USING (true);

-- Função de atribuição automática (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faixa text;
  v_last_order integer;
  v_next_user_id uuid;
  v_next_order integer;
  v_config_count integer;
BEGIN
  -- Se já tem responsável, não faz nada
  IF NEW.responsavel_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determinar a faixa com base no valor_produto
  IF NEW.valor_produto IS NULL OR NEW.valor_produto <= 10000 THEN
    v_faixa := 'ate_10k';
  ELSE
    v_faixa := 'acima_10k';
  END IF;

  -- Contar usuários ativos na faixa
  SELECT count(*) INTO v_config_count
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true;

  -- Se não há usuários configurados, retorna sem atribuir
  IF v_config_count = 0 THEN
    RETURN NEW;
  END IF;

  -- Buscar último ordem atribuído
  SELECT last_assigned_order INTO v_last_order
  FROM auto_assign_state
  WHERE faixa = v_faixa
  FOR UPDATE;

  -- Buscar próximo usuário (round-robin)
  SELECT user_id, ordem INTO v_next_user_id, v_next_order
  FROM auto_assign_config
  WHERE faixa = v_faixa AND ativo = true AND ordem > v_last_order
  ORDER BY ordem ASC
  LIMIT 1;

  -- Se não encontrou (chegou ao fim), volta ao início
  IF v_next_user_id IS NULL THEN
    SELECT user_id, ordem INTO v_next_user_id, v_next_order
    FROM auto_assign_config
    WHERE faixa = v_faixa AND ativo = true
    ORDER BY ordem ASC
    LIMIT 1;
  END IF;

  -- Atribuir o lead
  IF v_next_user_id IS NOT NULL THEN
    NEW.responsavel_id := v_next_user_id;

    -- Atualizar estado do round-robin
    UPDATE auto_assign_state
    SET last_assigned_order = v_next_order, updated_at = now()
    WHERE faixa = v_faixa;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT na tabela leads
CREATE TRIGGER trigger_auto_assign_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead();
