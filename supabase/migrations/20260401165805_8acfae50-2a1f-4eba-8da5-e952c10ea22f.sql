
-- Add permanent ruptura flag
ALTER TABLE public.carregamentos_dia
ADD COLUMN ruptura_sinalizada boolean NOT NULL DEFAULT false;

-- Trigger function: once ruptura is true, ruptura_sinalizada stays true forever
CREATE OR REPLACE FUNCTION public.set_ruptura_sinalizada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ruptura = true THEN
    NEW.ruptura_sinalizada := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ruptura_sinalizada
BEFORE INSERT OR UPDATE ON public.carregamentos_dia
FOR EACH ROW
EXECUTE FUNCTION public.set_ruptura_sinalizada();

-- Backfill existing data
UPDATE public.carregamentos_dia SET ruptura_sinalizada = true WHERE ruptura = true;
