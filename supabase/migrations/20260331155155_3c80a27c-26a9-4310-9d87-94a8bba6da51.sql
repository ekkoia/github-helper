
CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'manual',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean DEFAULT false,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all events"
  ON public.agenda_events FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own events"
  ON public.agenda_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own events"
  ON public.agenda_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own events"
  ON public.agenda_events FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own events"
  ON public.agenda_events FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
