-- 1. Atualizar handle_new_user para verificar pending_invites em vez de invited_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se existe pending_invite para este email, não criar profile ainda
  -- O profile será criado quando o usuário confirmar o email
  IF EXISTS (SELECT 1 FROM public.pending_invites WHERE email = NEW.email) THEN
    RETURN NEW;
  END IF;

  -- Criar profile normalmente para usuários auto-cadastrados
  INSERT INTO public.profiles (user_id, email, nome_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- 2. Limpar profiles criados incorretamente para usuários com pending_invite
-- Primeiro deletar user_roles e user_preferences (dependem de profiles)
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT p.user_id FROM public.profiles p 
  WHERE p.email IN (SELECT email FROM public.pending_invites)
);

DELETE FROM public.user_preferences 
WHERE user_id IN (
  SELECT p.user_id FROM public.profiles p 
  WHERE p.email IN (SELECT email FROM public.pending_invites)
);

-- Depois deletar os profiles
DELETE FROM public.profiles 
WHERE email IN (SELECT email FROM public.pending_invites);