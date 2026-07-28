-- 1) Grant on the interaction view
GRANT SELECT ON public.lead_last_interaction TO authenticated;

-- 2) Update RLS on leads to include SDR
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;
CREATE POLICY "Users can view assigned leads" ON public.leads
  FOR SELECT
  USING (
    is_admin(auth.uid())
    OR has_role(auth.uid(), 'sdr'::app_role)
    OR responsavel_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
CREATE POLICY "Users can update assigned leads" ON public.leads
  FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR has_role(auth.uid(), 'sdr'::app_role)
    OR responsavel_id = auth.uid()
  );
