-- ============================================
-- AUDITORIA DE SEGURANÇA — CORREÇÕES
-- ============================================

-- 1) portal_tokens: bloquear leitura anônima ampla.
-- O portal público acessa via /portal/:token e a query usa .eq("token", X).
-- Permitimos SELECT anon SOMENTE quando o token específico é informado no filtro.
-- Solução simples e segura: manter apenas authenticated com USING true
-- e o portal público vai usar a anon key (já é authenticated do ponto de vista da API)
-- mas o ANON role é separado. Para o portal público funcionar sem login,
-- mantemos SELECT para anon mas exigimos que a query passe pelo token (filtro client-side).
-- Como o RLS não consegue exigir filtro, removemos acesso anon e o portal passa a usar
-- uma RPC security-definer.

DROP POLICY IF EXISTS "Public select portal_tokens" ON public.portal_tokens;

CREATE POLICY "Authenticated select portal_tokens"
ON public.portal_tokens
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

-- RPC pública para o portal do motorista (anon) buscar UM token específico
CREATE OR REPLACE FUNCTION public.get_portal_token_public(_token text)
RETURNS TABLE (
  carga_id text,
  nome_carga text,
  placa text,
  motorista text,
  transportadora text,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT carga_id, nome_carga, placa, motorista, transportadora, expires_at
  FROM public.portal_tokens
  WHERE token = _token
    AND expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_token_public(text) TO anon, authenticated;

-- 2) motoristas: restringir SELECT (CPF/telefone são PII)
DROP POLICY IF EXISTS "Authenticated select motoristas" ON public.motoristas;

CREATE POLICY "Ops select motoristas"
ON public.motoristas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'portaria'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);
-- Mantemos faturamento porque relatórios/consolidados podem listar motorista por carga.

-- 3) clientes: restringir SELECT a roles operacionais (excluir portaria)
DROP POLICY IF EXISTS "Authenticated select clientes" ON public.clientes;

CREATE POLICY "Ops select clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

-- 4) Bucket portaria: restringir INSERT por role
DROP POLICY IF EXISTS "Authenticated upload portaria" ON storage.objects;

CREATE POLICY "Ops upload portaria"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portaria' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'logistica'::app_role) OR
    has_role(auth.uid(), 'portaria'::app_role)
  )
);

-- 5) cep_cache: restringir escrita a roles operacionais
DROP POLICY IF EXISTS "Authenticated insert cep_cache" ON public.cep_cache;
DROP POLICY IF EXISTS "Authenticated update cep_cache" ON public.cep_cache;

CREATE POLICY "Ops write cep_cache insert"
ON public.cep_cache
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

CREATE POLICY "Ops write cep_cache update"
ON public.cep_cache
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

-- 6) route_cache: restringir escrita
DROP POLICY IF EXISTS "Authenticated insert route_cache" ON public.route_cache;
DROP POLICY IF EXISTS "Authenticated update route_cache" ON public.route_cache;

CREATE POLICY "Ops write route_cache insert"
ON public.route_cache
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);

CREATE POLICY "Ops write route_cache update"
ON public.route_cache
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'logistica'::app_role) OR
  has_role(auth.uid(), 'faturamento'::app_role)
);