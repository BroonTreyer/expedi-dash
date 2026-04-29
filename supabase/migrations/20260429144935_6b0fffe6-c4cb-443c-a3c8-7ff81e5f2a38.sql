CREATE OR REPLACE FUNCTION public.preserve_peso_original()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _peso_original_explicit boolean := false;
  _ruptura_sinalizada_explicit boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.peso_original IS NULL THEN
      NEW.peso_original := NEW.peso;
    END IF;
    IF NEW.quantidade_original IS NULL THEN
      NEW.quantidade_original := NEW.quantidade;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    _peso_original_explicit := NEW.peso_original IS NOT NULL
                               AND NEW.peso_original IS DISTINCT FROM OLD.peso_original;
    _ruptura_sinalizada_explicit := NEW.ruptura_sinalizada IS DISTINCT FROM OLD.ruptura_sinalizada;

    IF NOT _peso_original_explicit THEN
      IF NEW.peso_original IS NULL OR NEW.peso_original IS NOT DISTINCT FROM OLD.peso_original THEN
        NEW.peso_original := COALESCE(OLD.peso_original, OLD.peso, NEW.peso);
      END IF;
    END IF;
    IF NEW.quantidade_original IS NULL OR NEW.quantidade_original IS NOT DISTINCT FROM OLD.quantidade_original THEN
      NEW.quantidade_original := COALESCE(OLD.quantidade_original, OLD.quantidade, NEW.quantidade);
    END IF;

    IF NOT _ruptura_sinalizada_explicit THEN
      IF NEW.ruptura = false
         AND NEW.peso_original IS NOT NULL
         AND NEW.peso IS NOT NULL
         AND NEW.peso < NEW.peso_original THEN
        NEW.ruptura_sinalizada := true;
      ELSIF NEW.ruptura = false
            AND NEW.peso_original IS NOT NULL
            AND NEW.peso IS NOT NULL
            AND NEW.peso >= NEW.peso_original THEN
        NEW.ruptura_sinalizada := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_ruptura_sinalizada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _explicit boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _explicit := NEW.ruptura_sinalizada IS DISTINCT FROM OLD.ruptura_sinalizada;
  END IF;

  IF NEW.ruptura = true THEN
    NEW.ruptura_sinalizada := true;
  ELSIF NEW.ruptura = false
        AND NOT _explicit
        AND (NEW.peso_original IS NULL OR NEW.peso IS NULL OR NEW.peso >= NEW.peso_original) THEN
    NEW.ruptura_sinalizada := false;
  END IF;
  RETURN NEW;
END;
$function$;