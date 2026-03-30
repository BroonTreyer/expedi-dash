CREATE TABLE public.veiculos_esperados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_referencia date NOT NULL DEFAULT CURRENT_DATE,
  grupo text NOT NULL DEFAULT 'PRÓPRIA',
  placa text NOT NULL,
  destino text,
  carga_id text,
  peso numeric,
  qtd_entregas integer,
  motorista text,
  transportadora text,
  ajudantes text,
  tipo_veiculo text,
  conferido boolean NOT NULL DEFAULT false,
  conferido_por uuid,
  conferido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por uuid
);

ALTER TABLE public.veiculos_esperados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select veiculos_esperados" ON public.veiculos_esperados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert veiculos_esperados" ON public.veiculos_esperados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update veiculos_esperados" ON public.veiculos_esperados FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete veiculos_esperados" ON public.veiculos_esperados FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));