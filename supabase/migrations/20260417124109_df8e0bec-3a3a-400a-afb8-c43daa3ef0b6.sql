-- Add walk-in fields to veiculos_esperados
ALTER TABLE public.veiculos_esperados
  ADD COLUMN IF NOT EXISTS walk_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_autorizacao text NOT NULL DEFAULT 'previsto',
  ADD COLUMN IF NOT EXISTS autorizado_por uuid,
  ADD COLUMN IF NOT EXISTS autorizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_recusa text,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE INDEX IF NOT EXISTS idx_veiculos_esperados_status_autorizacao
  ON public.veiculos_esperados (status_autorizacao)
  WHERE status_autorizacao = 'aguardando_autorizacao';

-- Trigger: notify when walk-in arrival is requested or approved/refused
CREATE OR REPLACE FUNCTION public.on_walkin_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_autorizacao = 'aguardando_autorizacao' THEN
      PERFORM notify_role(
        'logistica',
        'Chegada sem previsão',
        'Veículo ' || NEW.placa || COALESCE(' (' || NEW.motorista || ')', '') || ' aguardando autorização',
        'walkin_pendente',
        'veiculo_esperado',
        NEW.id::text
      );
      PERFORM notify_role(
        'admin',
        'Chegada sem previsão',
        'Veículo ' || NEW.placa || COALESCE(' (' || NEW.motorista || ')', '') || ' aguardando autorização',
        'walkin_pendente',
        'veiculo_esperado',
        NEW.id::text
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status_autorizacao IS DISTINCT FROM NEW.status_autorizacao THEN
      IF NEW.status_autorizacao = 'autorizado' THEN
        PERFORM notify_role(
          'portaria',
          'Entrada autorizada',
          'Veículo ' || NEW.placa || ' liberado para entrada',
          'walkin_autorizado',
          'veiculo_esperado',
          NEW.id::text
        );
      ELSIF NEW.status_autorizacao = 'recusado' THEN
        PERFORM notify_role(
          'portaria',
          'Entrada recusada',
          'Veículo ' || NEW.placa || ' teve entrada recusada' || COALESCE(' - ' || NEW.motivo_recusa, ''),
          'walkin_recusado',
          'veiculo_esperado',
          NEW.id::text
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_walkin_status_change ON public.veiculos_esperados;
CREATE TRIGGER trg_walkin_status_change
AFTER INSERT OR UPDATE OF status_autorizacao ON public.veiculos_esperados
FOR EACH ROW
EXECUTE FUNCTION public.on_walkin_status_change();