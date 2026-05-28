---
name: Pre-carga data prevista
description: "Data do Carregamento" na tela /pre-cargas é informativa (data_prevista_carregamento). Não afeta filtros nem painéis.
type: feature
---
A coluna `carregamentos_dia.data_prevista_carregamento` (date, nullable) é puramente informativa:
- Editada pelo Faturamento no bloco rosa da página `/pre-cargas` via `useAtualizarDataCarga`.
- NÃO toca em `carregamentos_dia.data`, então NÃO afeta o Painel, Rupturas, Consolidado nem o carry-over de 30 dias.
- Exibição faz fallback para `data` quando ainda não preenchida (pré-cargas legadas).
- A mutation só invalida `["pre-cargas"]`.

Rupturas (`/rupturas` → aba "Faltando agora") só removem o item quando ele é efetivamente `status = "Carregado"`. O filtro antigo `etapa === "logistica"` foi removido — rupturas permanecem visíveis durante todo o ciclo pré-carga → fechada → no pátio.
