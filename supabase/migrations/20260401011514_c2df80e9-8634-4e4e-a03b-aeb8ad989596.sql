
CREATE TABLE public.portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  carga_id text NOT NULL,
  nome_carga text,
  placa text,
  motorista text,
  transportadora text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_tokens_token ON public.portal_tokens (token);
CREATE INDEX idx_portal_tokens_carga ON public.portal_tokens (carga_id);

ALTER TABLE public.portal_tokens ENABLE ROW LEVEL SECURITY;

-- Público pode ver (motorista acessa sem login)
CREATE POLICY "Public select portal_tokens"
  ON public.portal_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

-- Apenas admin/logística cria tokens
CREATE POLICY "Ops insert portal_tokens"
  ON public.portal_tokens FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));

-- Apenas admin/logística deleta
CREATE POLICY "Ops delete portal_tokens"
  ON public.portal_tokens FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'logistica'::app_role));
