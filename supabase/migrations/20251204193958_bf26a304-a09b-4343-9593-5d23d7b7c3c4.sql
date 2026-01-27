-- Criar trigger para limpar pending_invites quando um profile é criado
-- Primeiro, verificar se o trigger já existe e remover
DROP TRIGGER IF EXISTS on_profile_created_cleanup_invite ON public.profiles;

-- Criar o trigger para executar handle_invite_confirmation quando um profile é criado
CREATE TRIGGER on_profile_created_cleanup_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_invite_confirmation();