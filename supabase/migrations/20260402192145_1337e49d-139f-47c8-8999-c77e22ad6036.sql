
CREATE TABLE public.data_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description text,
  created_by uuid,
  snapshot_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin select data_snapshots"
ON public.data_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insert data_snapshots"
ON public.data_snapshots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin delete data_snapshots"
ON public.data_snapshots FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
