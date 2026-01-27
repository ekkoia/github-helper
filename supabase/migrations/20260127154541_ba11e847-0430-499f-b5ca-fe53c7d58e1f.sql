-- Corrigir trigger handle_user_email_confirmed removendo ON CONFLICT incorreto
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  invite_role app_role;
  invite_nome text;
  invite_telefone text;
BEGIN
  -- Se o email foi confirmado agora (era NULL e agora tem valor)
  -- E o usuário foi originalmente convidado
  IF OLD.email_confirmed_at IS NULL 
     AND NEW.email_confirmed_at IS NOT NULL 
     AND NEW.invited_at IS NOT NULL THEN
    
    -- Verificar se já existe profile (para evitar duplicação)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
      
      -- Buscar dados do pending_invite
      SELECT role, nome_completo, telefone 
      INTO invite_role, invite_nome, invite_telefone
      FROM public.pending_invites 
      WHERE email = NEW.email;
      
      -- Criar profile usando dados do invite ou metadados
      INSERT INTO public.profiles (user_id, email, nome_completo, telefone)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(invite_nome, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        COALESCE(invite_telefone, NEW.raw_user_meta_data->>'telefone')
      );
      
      -- Criar role (sem ON CONFLICT - já verificamos que não existe profile)
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, COALESCE(invite_role, 'user'));
      
      -- Criar preferências padrão
      INSERT INTO public.user_preferences (user_id)
      VALUES (NEW.id);
      
      -- Remover convite pendente
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;