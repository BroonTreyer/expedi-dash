-- 1) Trigger set_ruptura_sinalizada: agora também desliga a flag quando o estado volta a "sem ruptura"
CREATE OR REPLACE FUNCTION public.set_ruptura_sinalizada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.ruptura = true THEN
    NEW.ruptura_sinalizada := true;
  ELSIF NEW.ruptura = false
        AND (NEW.peso_original IS NULL OR NEW.peso IS NULL OR NEW.peso >= NEW.peso_original) THEN
    -- Sem ruptura total e sem ruptura parcial => limpa a flag
    NEW.ruptura_sinalizada := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) preserve_peso_original: também limpa ruptura_sinalizada quando peso volta ao original
CREATE OR REPLACE FUNCTION public.preserve_peso_original()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.peso_original IS NULL THEN
      NEW.peso_original := NEW.peso;
    END IF;
    IF NEW.quantidade_original IS NULL THEN
      NEW.quantidade_original := NEW.quantidade;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.peso_original IS NULL OR NEW.peso_original IS NOT DISTINCT FROM OLD.peso_original THEN
      NEW.peso_original := COALESCE(OLD.peso_original, OLD.peso, NEW.peso);
    END IF;
    IF NEW.quantidade_original IS NULL OR NEW.quantidade_original IS NOT DISTINCT FROM OLD.quantidade_original THEN
      NEW.quantidade_original := COALESCE(OLD.quantidade_original, OLD.quantidade, NEW.quantidade);
    END IF;
    -- Marca ruptura parcial
    IF NEW.ruptura = false
       AND NEW.peso_original IS NOT NULL
       AND NEW.peso IS NOT NULL
       AND NEW.peso < NEW.peso_original THEN
      NEW.ruptura_sinalizada := true;
    -- Limpa quando peso voltou ao original (ou ficou maior) e não há ruptura total
    ELSIF NEW.ruptura = false
          AND NEW.peso_original IS NOT NULL
          AND NEW.peso IS NOT NULL
          AND NEW.peso >= NEW.peso_original THEN
      NEW.ruptura_sinalizada := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Backfill: limpa flags fantasma em registros que hoje não têm mais ruptura
UPDATE public.carregamentos_dia
SET ruptura_sinalizada = false
WHERE ruptura_sinalizada = true
  AND ruptura = false
  AND (peso_original IS NULL OR peso IS NULL OR peso >= peso_original);