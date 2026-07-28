DROP POLICY IF EXISTS "Authenticated users can access chat_messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view assigned lead chat messages" ON public.chat_messages;

CREATE POLICY "Users can view assigned lead chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.responsavel_id = auth.uid()
      AND public.normalize_telefone_br(l.telefone) = public.normalize_telefone_br(chat_messages.phone)
  )
);