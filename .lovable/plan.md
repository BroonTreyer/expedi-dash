## Objetivo
Permitir editar manualmente o **Peso total** por transportadora no card "Resumo" da aba Adiantamentos (hoje fixo em 28.000 kg calculado pelo peso efetivo das ordens), pois o peso real pode diferir do declarado nos CT-es.

## Mudanças

### `src/components/logistica/AdiantamentosTab.tsx`
- Novo estado `pesosManuais: Record<string, number>` (por nome de transportadora), análogo a `adtManuais`.
- No `resumoPorTransp`: se houver `pesosManuais[nome]` definido, usar esse valor no campo `peso` (e marcar `pesoManual: true`); senão manter o cálculo atual via `pesoEfetivoDeCtes`.
- No card do Resumo (por transportadora), adicionar um input pequeno "Peso manual (kg)" logo abaixo do "R$/kg fechado", com botão ↺ para voltar ao automático (quando override ativo). O R$/kg passa a refletir o peso editado automaticamente.
- Em `handleGerar`, quando houver peso manual, ratear proporcionalmente ao peso original de cada CT-e (fallback: rateio igual se soma zero) e enviar no `peso_total` de cada item ao `criar.mutateAsync`, para o adiantamento salvo já refletir o peso corrigido.
- Limpar `pesosManuais` após gerar, junto com `adtManuais`.

### Nenhuma alteração em
- `useAdiantamentos.ts` (o hook já soma o `peso_total` recebido de cada CT-e — basta enviar o valor rateado).
- Schema/DB (`adiantamentos_frete.peso_total` já existe como número editável).

## Detalhes técnicos
- Input controlado com `type="number"`, `min={0}`, `step="1"`, aceita vazio (sem override).
- Placeholder mostra o peso automático atual (ex.: `Peso manual (auto: 28.000)`).
- Rateio: `pesoAjustadoCte = (pesoOriginalCte / somaPesosOriginais) * pesoManualTotal`; se `somaPesosOriginais === 0`, distribuir igualmente entre os CT-es.
- `totaisGerais.peso` continua somando `r.peso` — passa a refletir os overrides automaticamente.