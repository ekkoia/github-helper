CREATE TABLE agenda_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  block_date date NOT NULL,
  start_time time DEFAULT NULL,
  end_time time DEFAULT NULL,
  all_day boolean DEFAULT true,
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, block_date, start_time)
);

ALTER TABLE agenda_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks" ON agenda_blocks
  FOR ALL TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all blocks" ON agenda_blocks
  FOR ALL TO authenticated USING (is_admin(auth.uid()));