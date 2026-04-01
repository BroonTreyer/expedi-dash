
CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  doca text NOT NULL,
  horario_inicio time NOT NULL,
  horario_fim time NOT NULL,
  carga_id text,
  nome_carga text,
  placa text,
  motorista text,
  transportadora text,
  status text NOT NULL DEFAULT 'agendado',
  observacoes text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agendamentos_data_doca ON public.agendamentos (data, doca);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select agendamentos"
  ON public.agendamentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/logistica insert agendamentos"
  ON public.agendamentos FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Admin/logistica update agendamentos"
  ON public.agendamentos FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

CREATE POLICY "Admin delete agendamentos"
  ON public.agendamentos FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
