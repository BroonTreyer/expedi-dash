## Objetivo
Permitir gerar adiantamentos de **várias transportadoras de uma só vez** na aba "Montar Lote", criando 1 adiantamento por transportadora num único clique.

## Mudanças

### `src/components/logistica/AdiantamentosTab.tsx`
- Remover o `select` de transportadora única. Listar **todas as transportadoras com CT-es disponíveis**, cada uma como uma seção colapsável (Card) contendo seus grupos de OC e CT-es (mesma UI de hoje).
- Estado `selecionados: Set<string>` continua global (IDs de CT-es de qualquer transportadora).
- Cada seção tem:
  - Cabeçalho com nome da transportadora, badge "X CT-es selecionados", subtotal e campo `% Adiantamento` próprio (default = `percentual_adiantamento_padrao` da transportadora, ou 50%).
  - Aviso âmbar se a transportadora não tiver cadastro financeiro.
  - Checkbox "selecionar todos os CT-es desta transportadora".
- **Painel "Resumo" lateral** passa a mostrar agregado multi-transportadora:
  - Lista por transportadora: nº de CT-es, total frete, % aplicado, valor adiantamento, saldo.
  - Totais gerais (soma de todos).
  - Campo único de "Observações" aplicado a todos.
  - Botão **"Gerar N adiantamentos"** (N = nº de transportadoras com seleção).

### `handleGerar` (mesmo arquivo)
- Agrupar `ctesEscolhidos` por `transportadora`.
- Para cada grupo, chamar `criar.mutateAsync(...)` em sequência (não paralelo, para não estourar a numeração `next_adiantamento_numero`).
- Acumular resultados; ao final, abrir o `ComprovanteAdiantamentoDialog` apenas do **primeiro** gerado e mostrar toast "N adiantamentos gerados".
- Se algum falhar, abortar os subsequentes e mostrar quais foram criados.

## Fora de escopo
- Sem alteração de schema, RLS, hooks ou edge functions.
- Sem mudança nas abas Pendentes / Pagos / Quitados.
- Sem alteração no `useCriarAdiantamento` — usado N vezes como hoje.
