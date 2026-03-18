
CREATE TABLE public.movimentacoes_portaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_movimento text NOT NULL,
  categoria text NOT NULL DEFAULT 'outros',
  placa text,
  motorista text,
  empresa text,
  destino_setor text,
  motivo text,
  carga_id text,
  foto_placa_url text,
  texto_placa_lido text,
  confianca_placa numeric,
  placa_confirmada text,
  foto_documento_url text,
  observacoes text,
  usuario_id uuid,
  data_hora timestamptz NOT NULL DEFAULT now(),
  movimento_vinculado_id uuid REFERENCES public.movimentacoes_portaria(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_portaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select movimentacoes_portaria" ON public.movimentacoes_portaria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert movimentacoes_portaria" ON public.movimentacoes_portaria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update movimentacoes_portaria" ON public.movimentacoes_portaria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete movimentacoes_portaria" ON public.movimentacoes_portaria FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_movimentacoes_portaria_data_hora ON public.movimentacoes_portaria (data_hora);
CREATE INDEX idx_movimentacoes_portaria_tipo ON public.movimentacoes_portaria (tipo_movimento);
CREATE INDEX idx_movimentacoes_portaria_vinculado ON public.movimentacoes_portaria (movimento_vinculado_id);
