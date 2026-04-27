-- Realtime: permitir que usuários autenticados recebam eventos
-- (RLS das tabelas base continua filtrando o conteúdo).
-- Bloquear broadcasts iniciados pelo cliente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='realtime' AND tablename='messages'
      AND policyname='Authenticated can receive realtime'
  ) THEN
    CREATE POLICY "Authenticated can receive realtime"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='realtime' AND tablename='messages'
      AND policyname='Block client-initiated broadcasts'
  ) THEN
    CREATE POLICY "Block client-initiated broadcasts"
      ON realtime.messages
      FOR INSERT
      TO authenticated
      WITH CHECK (false);
  END IF;
END $$;