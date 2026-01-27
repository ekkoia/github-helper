-- Create table for pending invites
CREATE TABLE public.pending_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  role TEXT DEFAULT 'user',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all pending invites
CREATE POLICY "Admins can view pending invites"
ON public.pending_invites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global'::app_role));

-- Admins can insert pending invites
CREATE POLICY "Admins can insert pending invites"
ON public.pending_invites
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global'::app_role));

-- Admins can delete pending invites
CREATE POLICY "Admins can delete pending invites"
ON public.pending_invites
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global'::app_role));

-- Create function to remove pending invite when user confirms account
CREATE OR REPLACE FUNCTION public.handle_invite_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove from pending invites when user confirms
  DELETE FROM public.pending_invites WHERE email = NEW.email;
  RETURN NEW;
END;
$$;

-- Trigger to remove pending invite when profile is created
CREATE TRIGGER on_profile_created_remove_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_invite_confirmation();