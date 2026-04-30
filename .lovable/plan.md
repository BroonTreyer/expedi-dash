## Diagnóstico — visualização da Portaria está escondendo veículos legítimos

Conferi no banco e os dois caminhões **estão certos lá**. O problema é só de filtro na tela `/portaria/terceirizado`.

### Caso 1 — Jesumar (SMQ3D94 / CEARA CIF) sumiu do "Pátio"

No banco:
- `movimentacoes_portaria.data_hora = 29/04 20:15` (chegou ontem à noite)
- `horario_entrada = 30/04 10:59` (foi liberado para o pátio hoje)
- `etapa_terceirizado = no_patio` ✅

A tela usa `useMovimentacoes(from, to)` que filtra por `data_hora` entre `from` e `to`. Como o porteiro está com "Hoje" (30/04), o registro do Jesumar **fica de fora** porque o `data_hora` dele é 29/04, mesmo ele tendo entrado no pátio hoje. Resultado: ele está fisicamente no pátio mas não aparece em lugar nenhum.

### Caso 2 — Fagno (QWE1B20 / JR MIX) sumiu de "Esperados"

No banco:
- `veiculos_esperados`: `walk_in=true`, `grupo='WALK-IN-TERCEIRIZADO'`, `status_autorizacao='autorizado'`, `carga_id='JR MIX'`, `conferido=false`, `data_referencia=30/04` ✅

Em `Portaria.tsx` linha 73:
```ts
veiculosEsperadosAll.filter((v) => v.grupo === meta.grupoEsperado)
```
e `meta.grupoEsperado = 'TERCEIRIZADO'`. Como o grupo do Fagno é literalmente a string `'WALK-IN-TERCEIRIZADO'`, ele é descartado pelo filtro estrito (`===`). Walk-ins terceirizados nunca aparecem na aba Esperados — só os importados via planilha.

> Ele aparece no painel rosa "Aguardando vínculo da Logística" (que usa outro hook), mas como já foi autorizado/vinculado, sumiu de lá também — e a aba "Esperados" o ignora pelo grupo. Daí o "buraco".

## Correções

### 1) Aba "Pátio" — incluir movimentações ainda ativas que entraram em dias anteriores

No `Portaria.tsx`:
- Mudar a query de movimentações para também trazer **movimentos abertos (no pátio) cuja `data_hora` é anterior à janela** mas que ainda não foram finalizados.
- Forma mais limpa: criar uma segunda query `useMovimentacoesAbertas()` que traz tudo onde:
  - `categoria = categoria` da página
  - **e** (`tipo_movimento='entrada' AND etapa_terceirizado NOT IN ('finalizado') AND movimento_vinculado_id IS NULL`)
  - **ou** (`categoria='carga_propria' AND tipo_movimento='saida' AND etapa_carga_propria NOT IN ('finalizado')`)
  - sem filtro de data, mas limitado a últimos 30 dias para não estourar.
- Mesclar `movimentacoesAll` com esses "abertos" deduplicando por `id` antes de calcular `counts.patio` e antes de passar para `PatioAtualTab`.
- A aba "Histórico" continua respeitando o filtro de data (não muda).

Resultado: o Jesumar volta a aparecer em "Pátio" mesmo quando o filtro está em "Hoje", porque ele ainda está no pátio.

### 2) Aba "Esperados" — aceitar walk-ins do mesmo grupo

Trocar o filtro estrito em `Portaria.tsx`:
```ts
const grupoEsperado = meta.grupoEsperado; // 'TERCEIRIZADO' | 'PRÓPRIA'
const veiculosEsperados = veiculosEsperadosAll.filter(
  (v) => v.grupo === grupoEsperado || v.grupo === `WALK-IN-${grupoEsperado === 'PRÓPRIA' ? 'PROPRIA' : 'TERCEIRIZADO'}`
);
```

Assim qualquer veículo cuja chegada ainda não foi conferida (walk-in autorizado **ou** importado da planilha) aparece na aba "Esperados" do grupo certo. O Fagno volta a aparecer.

### 3) (Bônus, sem mudança de comportamento) Pequena melhoria de KPI

A contagem `counts.patio` já leva em conta `etapa_terceirizado === 'finalizado'` e movimentos com saída vinculada — ela vai funcionar automaticamente quando a fonte de dados (item 1) estiver corrigida. Sem ajuste extra.

## Arquivos

```text
edit  src/pages/Portaria.tsx                  (mesclar movimentos abertos + relax do filtro de grupo)
edit  src/hooks/useMovimentacoesPortaria.ts   (novo hook useMovimentacoesAbertas)
```

Sem migração, sem mudança de RLS, sem mexer em edge functions.

## Validação

1. Em `/portaria/terceirizado` com filtro "Hoje":
   - **Pátio**: Jesumar (SMQ3D94) deve aparecer.
   - **Esperados**: Fagno (QWE1B20) deve aparecer com badge de walk-in autorizado.
2. Liberar o Fagno → ele sai de Esperados e entra no Pátio.
3. Voltar o filtro para "Últimos 7 dias" → Histórico continua mostrando tudo, sem duplicatas.
4. Em `/portaria/carga-propria`: regressão — verificar que veículos próprios em rota de ontem continuam aparecendo no pátio (já era o comportamento esperado, agora reforçado).
