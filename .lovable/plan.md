## O que muda

Você quer que a aba **Esperados** da Portaria mostre **sempre todos os veículos esperados**, sem filtrar por data — mesmo estando hoje (30/04) com veículos cadastrados para 02/05, 04/05, semana que vem etc.

## Correção (2 arquivos)

### 1. `src/hooks/useVeiculosEsperados.ts`
Adicionar uma flag opcional `options.showAll`. Quando `true`, a query ignora `data_referencia` e traz todos os esperados (limite alto de 2000 registros para segurança):

```ts
useVeiculosEsperados(dataReferencia, dataFim?, { showAll: true })
```

- Mantém compatibilidade com as outras telas que ainda chamam com 1 ou 2 argumentos.
- Sem `showAll`, comportamento atual permanece (janela ±3 dias ou intervalo exato).

### 2. `src/pages/Portaria.tsx`
Trocar a chamada atual:
```ts
useVeiculosEsperados(dateFromStr, dateToStr)
```
por:
```ts
useVeiculosEsperados(dateFromStr, dateToStr, { showAll: true })
```

Resultado: a aba **Esperados** passa a listar todos os veículos do grupo (`PRÓPRIA` ou `TERCEIRIZADO`) que ainda não foram conferidos, **independentemente da data selecionada na página**.

## O que NÃO muda

- O filtro de data continua valendo para as abas **Pátio**, **Histórico** e **Movimentações** (que dependem de data).
- A janela ±3 dias permanece para outras telas que usam o hook (ex.: painel "A Chegar" da Expedição).
- Os ajustes anteriores (auto-expansão do range no import, suporte a `dateFim`) continuam funcionais como fallback.

## Consequência prática

Hoje (30/04), a aba Esperados de Carga Própria vai listar imediatamente os 30 veículos importados (2 do dia 02/05 + 28 do dia 04/05) sem nenhum ajuste no calendário.

Posso aplicar?
