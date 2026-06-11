ALTER TABLE public.leads
  DROP CONSTRAINT leads_responsavel_id_fkey,
  ADD CONSTRAINT leads_responsavel_id_fkey
    FOREIGN KEY (responsavel_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.pending_invites
  DROP CONSTRAINT pending_invites_invited_by_fkey,
  ADD CONSTRAINT pending_invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;