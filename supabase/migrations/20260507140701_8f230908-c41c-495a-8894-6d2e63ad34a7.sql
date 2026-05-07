alter table public.route_cache
  add column if not exists pedagios jsonb default '[]'::jsonb,
  add column if not exists duracao_min_real numeric;