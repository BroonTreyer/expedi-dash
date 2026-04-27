-- 2. Tabela de vínculo login ↔ cadastro de vendedor
CREATE TABLE IF NOT EXISTS public.vendedor_users (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_id uuid NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendedor_users_vendedor_unique UNIQUE (vendedor_id)
);

ALTER TABLE public.vendedor_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own vendedor link"
  ON public.vendedor_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all vendedor links"
  ON public.vendedor_users FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages vendedor links insert"
  ON public.vendedor_users FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages vendedor links update"
  ON public.vendedor_users FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages vendedor links delete"
  ON public.vendedor_users FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Função helper para descobrir o vendedor_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_vendedor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vendedor_id FROM public.vendedor_users WHERE user_id = auth.uid()
$$;

-- 4. Políticas SELECT para o papel 'vendedor'
CREATE POLICY "Vendedor reads own carregamentos"
  ON public.carregamentos_dia FOR SELECT
  USING (
    public.has_role(auth.uid(), 'vendedor')
    AND vendedor_id = public.get_my_vendedor_id()
  );

CREATE POLICY "Vendedor reads clientes"
  ON public.clientes FOR SELECT
  USING (public.has_role(auth.uid(), 'vendedor'));

-- produtos, vendedores, tipos_caminhao já têm SELECT 'true' para authenticated; nada a fazer.

-- 5. Atualiza handle_new_user para vincular vendedor quando role='vendedor' e vendedor_id presente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role_meta text;
  _vendedor_meta uuid;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email);

  _role_meta := NEW.raw_user_meta_data->>'role';
  BEGIN
    _vendedor_meta := (NEW.raw_user_meta_data->>'vendedor_id')::uuid;
  EXCEPTION WHEN others THEN
    _vendedor_meta := NULL;
  END;

  IF _role_meta = 'vendedor' AND _vendedor_meta IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendedor')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.vendedor_users (user_id, vendedor_id)
    VALUES (NEW.id, _vendedor_meta)
    ON CONFLICT (user_id) DO UPDATE SET vendedor_id = EXCLUDED.vendedor_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'logistica')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
