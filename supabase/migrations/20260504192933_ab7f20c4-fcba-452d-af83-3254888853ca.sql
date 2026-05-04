ALTER TABLE public.veiculos_esperados REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos_esperados;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;