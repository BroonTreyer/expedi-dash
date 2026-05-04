# Atualização automática do painel Expedição

## Problema
O painel `/expedicao` está demorando para refletir mudanças porque:
1. `useCargasDiaExpedicao` (KPIs de peso e Cargas Expedidas) depende de polling de 30s — sem realtime.
2. `useVeiculosEsperados` (painel "A chegar") usa apenas polling de 15s — sem realtime, e a tabela `veiculos_esperados` **não está na publicação `supabase_realtime`**.
3. `useMovimentacoesPortaria` já tem realtime — funciona bem.

Por isso o usuário vê o dashboard "atrasado" entre 15–30s.

## Solução

### 1. Migration: habilitar realtime em `veiculos_esperados`
```sql
ALTER TABLE public.veiculos_esperados REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.veiculos_esperados;
```

### 2. Subscription realtime em `useVeiculosEsperados`
Adicionar um `useEffect` no hook que cria um channel `postgres_changes` em `veiculos_esperados` e invalida as queries relacionadas (`veiculos_esperados`, `veiculos_esperados_pendentes`, `veiculos_walkin_*`, `veiculos_aguardando_vinculo`).

### 3. Subscription realtime em `useCargasDiaExpedicao`
Adicionar `useEffect` com channel em `carregamentos_dia` que invalida `["cargas_dia_expedicao"]`. Assim qualquer mudança de status/peso atualiza KPIs e "Cargas expedidas do dia" em ~1s.

### 4. Reduzir polling de fallback
- `useCargasDiaExpedicao`: `refetchInterval` de 30s → 15s e `refetchOnWindowFocus: true`.
- Manter `useVeiculosEsperados` com 15s mas adicionar `refetchOnWindowFocus: true`.

## Resultado
Mudanças feitas na portaria, faturamento ou expedição refletem no dashboard em ~1 segundo, sem clique em "Atualizar".

## Arquivos alterados
- `supabase/migrations/<novo>.sql` — habilitar realtime em `veiculos_esperados`.
- `src/hooks/useVeiculosEsperados.ts` — subscription realtime.
- `src/hooks/useCargasDiaExpedicao.ts` — subscription realtime + tuning.
