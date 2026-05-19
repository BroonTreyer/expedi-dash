## Problema

Quando uma pré-carga é fechada (botão "Finalizar" / FechamentoLoteDialog), a etapa muda de `pre_carga` → `logistica`. O trigger `on_carga_fechada` só reage à transição `vendas → logistica`, então nesses fechamentos:

- a portaria **não recebe notificação** "Carga fechada";
- não é criado/atualizado o registro em `veiculos_esperados` para o veículo previsto;
- a movimentação de chegada órfã (placa já no pátio sem carga vinculada) **não recebe** o `carga_id`.

A `CF FRANGO / 15/05/2026 / RBK7D22` "sumiu" porque seguiu esse caminho — o veículo só apareceu na portaria por coincidência (já existia um walk-in autorizado da mesma placa de dias atrás).

## Correção

Migration única ajustando a condição do trigger `on_carga_fechada` para também aceitar a transição vinda da pré-carga, mantendo todo o resto do comportamento:

```sql
-- de:
IF OLD.etapa = 'vendas' AND NEW.etapa = 'logistica' AND NEW.carga_id IS NOT NULL THEN
-- para:
IF OLD.etapa IN ('vendas','pre_carga')
   AND NEW.etapa = 'logistica'
   AND NEW.carga_id IS NOT NULL THEN
```

Nada muda em código de UI/hooks — a regra é puramente de banco.

## Validação

1. Após aplicar, fechar uma pré-carga de teste e conferir:
   - aparece notificação "Carga fechada" para os papéis `portaria` e `logistica`;
   - se a placa é nova, é criado um `veiculos_esperados` com `status='previsto'` (ou autoriza walk-in existente);
   - se já existe uma chegada órfã com a mesma placa, ela recebe o `carga_id`.
2. Conferir que fechamentos vindos do fluxo antigo (`vendas → logistica`) continuam funcionando igual.

## Arquivos

- Nova migration em `supabase/migrations/` redefinindo `public.on_carga_fechada()`.
- Sem alterações em arquivos do frontend.
