-- Adicionar campo telefone na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telefone TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.telefone IS 'Telefone de contato do usuário';