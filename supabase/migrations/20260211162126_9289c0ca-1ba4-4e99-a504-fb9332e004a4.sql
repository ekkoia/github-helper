
-- Tabela de mapeamento CRM <-> Callix
CREATE TABLE public.user_callix_mapping (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  callix_assessor_id text NOT NULL,
  callix_list_id text NOT NULL,
  callix_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_callix_mapping ENABLE ROW LEVEL SECURITY;

-- Leitura para autenticados
CREATE POLICY "Authenticated users can read callix mapping"
  ON public.user_callix_mapping FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escrita apenas para admins
CREATE POLICY "Admins can insert callix mapping"
  ON public.user_callix_mapping FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update callix mapping"
  ON public.user_callix_mapping FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete callix mapping"
  ON public.user_callix_mapping FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Dados iniciais
INSERT INTO public.user_callix_mapping (user_id, callix_assessor_id, callix_list_id, callix_name) VALUES
  ('a53243c0-15bd-4aed-bcb4-e570afda7037', '9', '30', 'José Oliveira'),
  ('5e1f262c-6d09-44d7-b4bc-f59fead035a8', '8', '29', 'Yasmin Lima'),
  ('6da090fd-f1d0-4540-8eb2-b1bad98dc9a9', '7', '31', 'Lucas Lima'),
  ('54b47a0a-f307-483b-a93f-6c0a4321d3da', '6', '27', 'Lucas Silva'),
  ('fcc0eb8c-bd10-4870-8b6b-8c3495a3947e', '5', '28', 'Rodolfo Alegria'),
  ('48be7321-d3d4-4d8f-9eb4-41e685371db2', '4', '26', 'Ana Clara');
