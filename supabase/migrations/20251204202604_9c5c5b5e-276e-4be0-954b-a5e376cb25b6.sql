-- Fix user_roles policies to explicitly target authenticated users only
-- This prevents anonymous users from accessing these policies

-- Drop existing policies
DROP POLICY IF EXISTS "Global admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Global admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Global admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Global admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Recreate policies with TO authenticated to prevent anonymous access
CREATE POLICY "Global admins can delete roles" 
  ON user_roles 
  FOR DELETE 
  TO authenticated
  USING (has_role(auth.uid(), 'global'::app_role));

CREATE POLICY "Global admins can insert roles" 
  ON user_roles 
  FOR INSERT 
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'global'::app_role));

CREATE POLICY "Global admins can update roles" 
  ON user_roles 
  FOR UPDATE 
  TO authenticated
  USING (has_role(auth.uid(), 'global'::app_role));

CREATE POLICY "Global admins can view all roles" 
  ON user_roles 
  FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'global'::app_role));

CREATE POLICY "Users can view their own role" 
  ON user_roles 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);