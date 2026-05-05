-- Marcar como conferidos os veiculos esperados das duas cargas reabertas retroativamente
UPDATE public.veiculos_esperados
SET conferido = true,
    conferido_em = now(),
    status_autorizacao = 'autorizado',
    autorizado_em = COALESCE(autorizado_em, now())
WHERE carga_id IN ('CARGA-20260505133821-DJB','CARGA-20260505133821-CFD');
