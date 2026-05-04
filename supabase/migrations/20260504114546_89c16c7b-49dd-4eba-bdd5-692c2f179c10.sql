CREATE OR REPLACE FUNCTION public.normalize_veiculo_esperado_grupo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transportadora IS NOT NULL
     AND btrim(NEW.transportadora) <> ''
     AND NEW.grupo = 'WALK-IN-PROPRIA' THEN
    NEW.grupo := 'WALK-IN-TERCEIRIZADO';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_veic_esperado_grupo ON public.veiculos_esperados;
CREATE TRIGGER trg_normalize_veic_esperado_grupo
BEFORE INSERT OR UPDATE OF transportadora, grupo ON public.veiculos_esperados
FOR EACH ROW EXECUTE FUNCTION public.normalize_veiculo_esperado_grupo();