-- Remover políticas existentes da tabela leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can create leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- SELECT: Admins veem tudo, users veem APENAS leads atribuídos a eles
CREATE POLICY "Users can view assigned leads"
ON leads FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR responsavel_id = auth.uid()
);

-- INSERT: Qualquer usuário autenticado pode criar leads
CREATE POLICY "Authenticated users can create leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Admins podem atualizar qualquer lead, users apenas os atribuídos
CREATE POLICY "Users can update assigned leads"
ON leads FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR responsavel_id = auth.uid()
);

-- DELETE: Apenas admins podem excluir leads
CREATE POLICY "Only admins can delete leads"
ON leads FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));