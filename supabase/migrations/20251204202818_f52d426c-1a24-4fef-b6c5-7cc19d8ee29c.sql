-- Fix leads table security: Remove permissive policy and add authenticated-only access

-- 1. Drop the permissive policy
DROP POLICY IF EXISTS "Permitir acesso completo a leads" ON leads;

-- 2. Add policies that restrict access to authenticated users only
CREATE POLICY "Authenticated users can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global'::app_role));