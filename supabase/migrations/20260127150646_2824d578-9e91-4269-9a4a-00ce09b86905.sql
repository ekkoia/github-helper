-- 1. Atualizar função handle_new_user para ignorar usuários criados via invite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o usuário foi criado via invite, não criar profile ainda
  -- O profile será criado quando o usuário confirmar o email
  IF NEW.invited_at IS NOT NULL AND NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1))
  );
  
  -- Criar role padrão 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Criar preferências padrão
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- 2. Criar função para quando o usuário confirma o email
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
      
      -- Criar role (usar o role do pending_invite se existir)
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, COALESCE(invite_role, 'user'))
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Criar preferências padrão
      INSERT INTO public.user_preferences (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Remover convite pendente
      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Criar trigger para UPDATE em auth.users
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 4. Limpar dados duplicados existentes
DELETE FROM pending_invites 
WHERE email IN (SELECT email FROM profiles WHERE email IS NOT NULL);