

# Mostrar detalhes completos (Entrada + Saída) no Dialog

## Problema
O `HistoricoTab` agrupa entrada e saída em uma única linha, mas ao clicar "Detalhes", passa apenas `g.principal` (sempre a entrada). A foto do painel e o KM final estão no registro de **saída**, que nunca é exibido.

## Solução
Passar ambos os registros (entrada + saída) para o `MovimentoDetailsDialog` e exibir os dados combinados.

## Mudanças

### 1. `MovimentoDetailsDialog.tsx`
- Adicionar prop opcional `movimentoSaida?: MovimentacaoPortaria | null`
- Combinar dados: mostrar seção "Entrada" com dados/fotos da entrada e seção "Saída" com dados/fotos da saída
- Se `movimentoSaida` tiver `km_final` e a entrada tiver `km_inicial`, calcular e mostrar KM Rodado
- Fotos: mostrar fotos de ambos os registros (entrada e saída) na seção Evidencias

### 2. `HistoricoTab.tsx`
- Alterar `onViewDetails` para passar também o registro de saída: chamar com `g.entrada` e `g.saida`
- Atualizar a interface `Props.onViewDetails` para aceitar segundo parâmetro opcional

### 3. `Portaria.tsx`
- Atualizar `openDetails` para receber e armazenar o segundo movimento (saída)
- Passar `movimentoSaida` para o `MovimentoDetailsDialog`

### 4. Mobile cards no `HistoricoTab`
- O card mobile também passa ambos os registros ao clicar

## Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Portaria.tsx` | Adicionar state `detailsSaida`, passar para dialog |
| `src/components/portaria/HistoricoTab.tsx` | Passar `g.saida` junto com `g.entrada` no `onViewDetails` |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Aceitar `movimentoSaida`, mostrar dados combinados entrada+saída |

