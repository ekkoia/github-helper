
GRANT SELECT ON public.whatsapp_meta_templates TO authenticated;
GRANT ALL ON public.whatsapp_meta_templates TO service_role;

DROP POLICY IF EXISTS user_own_templates ON public.whatsapp_meta_templates;

CREATE POLICY "any_authenticated_can_view_templates"
  ON public.whatsapp_meta_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_insert_templates"
  ON public.whatsapp_meta_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role, 'global'::app_role])
  ));

CREATE POLICY "admin_update_templates"
  ON public.whatsapp_meta_templates
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role, 'global'::app_role])
  ));

CREATE POLICY "admin_delete_templates"
  ON public.whatsapp_meta_templates
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::app_role, 'global'::app_role])
  ));
