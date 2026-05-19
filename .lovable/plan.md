## Objetivo

Em **Logística → Adiantamentos**, permitir selecionar 1 ou mais lotes (adiantamentos) via checkbox e dar baixa em ação única — tanto em **Pendentes** (marcar como Pago) quanto em **Aguardando Quitação** (quitar só os lotes escolhidos da transportadora).

## Mudanças

### 1. `src/components/logistica/AdiantamentosTab.tsx` — aba **Pendentes**
- Adicionar coluna de checkbox no `ListaAdiantamentos` (header + por linha).
- Estado local `selectedPendentes: Set<string>` no `AdiantamentosTab`.
- Barra de ação acima da tabela quando houver seleção:
  - `N selecionados · Total Adt: R$ X` 
  - Botão **"Marcar como pago"** (chama `useMarcarAdiantamentoPago` para cada id) e botão **Limpar**.
- Confirmação simples antes de disparar.
- Após sucesso, limpa seleção.

### 2. `src/components/logistica/AdiantamentosTab.tsx` — aba **Aguardando Quitação**
- Em cada bloco de transportadora, expandir para listar os lotes com checkbox individual (mostrando nº, OC/Lote, saldo).
- Estado `selectedPagos: Set<string>` (compartilhado entre transportadoras).
- Botão **"Registrar Quitação"** por transportadora passa a abrir o dialog **apenas com os lotes selecionados daquela transportadora** (se nenhum selecionado → comportamento atual: todos).
- Mostrar resumo "X de Y lotes selecionados · Saldo selecionado: R$ Z".

### 3. `src/components/logistica/RegistrarQuitacaoDialog.tsx`
- Sem mudanças de assinatura: já recebe `adiantamentos[]` e quita só esses ids (`useRegistrarQuitacao` recebe `ids`).
- Apenas confirmar que título/totais refletem a lista parcial recebida (já reflete).

### 4. Hook `useMarcarAdiantamentoPago` (`src/hooks/useAdiantamentos.ts`)
- Já existe e marca 1 por vez. Para múltiplos, chamar em `Promise.all` no handler do componente — suficiente e simples; não é necessário criar variante em lote.

## Não muda
- Banco de dados, RLS, esquema, edge functions.
- Geração de adiantamento, comprovantes, cancelamento.
- Aba **Quitados** continua só leitura.

## Resultado esperado
- Pendentes: marcar 1, 2, N lotes como Pago de uma vez.
- Aguardando Quitação: escolher quais lotes da transportadora entram na quitação atual, deixando os outros pendentes.
