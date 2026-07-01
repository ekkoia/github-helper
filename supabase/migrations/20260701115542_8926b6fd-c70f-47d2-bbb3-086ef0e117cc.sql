
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS senha_definida boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET senha_definida = true WHERE senha_definida = false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pending_invites WHERE email = NEW.email) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (user_id, email, nome_completo, senha_definida)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
    true
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

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
  IF OLD.email_confirmed_at IS NULL
     AND NEW.email_confirmed_at IS NOT NULL
     AND NEW.invited_at IS NOT NULL THEN

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN

      SELECT role, nome_completo, telefone
      INTO invite_role, invite_nome, invite_telefone
      FROM public.pending_invites
      WHERE email = NEW.email;

      INSERT INTO public.profiles (user_id, email, nome_completo, telefone, senha_definida)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(invite_nome, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        COALESCE(invite_telefone, NEW.raw_user_meta_data->>'telefone'),
        false
      );

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, COALESCE(invite_role, 'user'));

      INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);

      DELETE FROM public.pending_invites WHERE email = NEW.email;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
