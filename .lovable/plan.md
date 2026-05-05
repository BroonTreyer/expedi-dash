# Finalizar registros de portaria nas datas corretas

## Situação atual

Ao consultar a tabela `movimentacoes_portaria`, encontrei **4 registros** para essas duas cargas:

| ID | Placa | Motorista | Data | Etapa |
|---|---|---|---|---|
| f6177ed1 | OZR0D10 | LUCAS | **05/05 10:46** | chegada (sem entrada/saída) |
| 65b4de50 | JBM8E58 | TONI | **05/05 10:46** | chegada (sem entrada/saída) |
| ff9832b6 | OZR0D10 | LUCAS | **02/05** | finalizado (chegada + entrada + saída) |
| abfe34bf | JBM8E58 | TONI | **04/05** | finalizado (chegada + entrada + saída) |

Os dois registros de **05/05** foram criados automaticamente pelo trigger quando reabri/fechei as cargas hoje. Eles aparecem no histórico de Terceirizados como "Entrada" recente (foto do print confirma — 10:46 hoje).

Os dois registros **finalizados** em 02/05 e 04/05 (que criei retroativamente na resposta anterior) já estão corretos.

> Observação: você escreveu "02/04 e 04/04", mas pelo contexto entendo que se refere a **02/05 e 04/05** (sábado/segunda passados). Se for outra data, me avise.

## Ação

Criar uma migration que **apaga os 2 registros duplicados de hoje (05/05)**:

- `f6177ed1-a5db-48d5-ba33-b6d40a49952b` (OZR0D10 / LUCAS)
- `65b4de50-2087-498f-bcf6-c2a151c6ef62` (JBM8E58 / TONI)

Isso vai:
- Remover as duas linhas vermelhas "Entrada 10:46" do histórico de hoje
- Manter intactos os registros finalizados em **02/05** (Lucas) e **04/05** (Toni), que continuarão aparecendo no histórico das datas corretas como expedidos

## Detalhes técnicos

```sql
DELETE FROM public.movimentacoes_portaria
WHERE id IN (
  'f6177ed1-a5db-48d5-ba33-b6d40a49952b',
  '65b4de50-2087-498f-bcf6-c2a151c6ef62'
);
```

Migration: `supabase/migrations/20260505150000_remover_duplicatas_portaria.sql`
