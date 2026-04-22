-- Add columns
ALTER TABLE public.carregamentos_dia
  ADD COLUMN IF NOT EXISTS peso_original numeric,
  ADD COLUMN IF NOT EXISTS quantidade_original numeric,
  ADD COLUMN IF NOT EXISTS motivo_ruptura text;

-- Backfill existing rows
UPDATE public.carregamentos_dia
  SET peso_original = peso
  WHERE peso_original IS NULL;
UPDATE public.carregamentos_dia
  SET quantidade_original = quantidade
  WHERE quantidade_original IS NULL;

-- Trigger function: preserve "original" values across updates
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
    -- Never overwrite original unless explicitly set to a non-null new value different from old
    IF NEW.peso_original IS NULL OR NEW.peso_original IS NOT DISTINCT FROM OLD.peso_original THEN
      NEW.peso_original := COALESCE(OLD.peso_original, OLD.peso, NEW.peso);
    END IF;
    IF NEW.quantidade_original IS NULL OR NEW.quantidade_original IS NOT DISTINCT FROM OLD.quantidade_original THEN
      NEW.quantidade_original := COALESCE(OLD.quantidade_original, OLD.quantidade, NEW.quantidade);
    END IF;
    -- Mark partial ruptura
    IF NEW.ruptura = false
       AND NEW.peso_original IS NOT NULL
       AND NEW.peso IS NOT NULL
       AND NEW.peso < NEW.peso_original THEN
      NEW.ruptura_sinalizada := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_peso_original ON public.carregamentos_dia;
CREATE TRIGGER trg_preserve_peso_original
  BEFORE INSERT OR UPDATE ON public.carregamentos_dia
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_peso_original();