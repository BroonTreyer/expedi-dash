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
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', ''), NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET nome = COALESCE(EXCLUDED.nome, public.profiles.nome),
        email = COALESCE(EXCLUDED.email, public.profiles.email);

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