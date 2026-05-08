## Múltiplas Ordens de Carga por Fechamento

Hoje o fechamento de carga aceita um único campo "Ordem de Carga" (texto), aplicado a todos os pedidos. A nova versão permitirá **uma OC por grupo de pedidos** (cada cliente da rota pode ter sua própria OC), continuando a aceitar OC única quando for o caso.

### Mudanças no diálogo de Fechamento (`FechamentoLoteDialog.tsx`)

1. **Modo de OC** — toggle no topo do bloco "Ordem de Carga":
   - **OC única para a carga inteira** (comportamento atual, padrão).
   - **OC por grupo de pedidos** (novo).

2. **Modo "OC única"**: mantém o input de hoje (`ordemCarga`).

3. **Modo "OC por grupo"**:
   - Em cada linha sortable de destino (`SortableDestRow`), exibir um input compacto "OC" ao lado do peso.
   - O estado das OCs por grupo fica em `Record<codigoCliente, string>`.
   - Validação: pelo menos uma OC preenchida; grupos sem OC ficam com valor vazio (não bloqueia, mas alerta).
   - Botão "Aplicar primeira OC a todos" para acelerar quando a maioria é igual.

4. **Submit**: cada item recebe `ordem_carga` do seu próprio grupo (em vez do valor único). A coluna `ordem_carga` em `carregamentos_dia` continua sendo `text` simples — sem migração.

5. **Resumo / impressão**: o `CargaPrintData` e o painel de comprovante mostram a lista distinta de OCs (ex: "OCs: 12345, 67890").

### Integração CT-e e Adiantamentos (match em qualquer OC)

- **`useCtesDacte.ts`** (vinculação automática CT-e ↔ pedidos): hoje compara `ordem_carga` do CT-e com `ordem_carga` do pedido. Trocar para `WHERE ordem_carga IN (lista distinta de OCs daquela carga)` ou usar `ilike any`. Como cada item já guarda sua própria OC, basta o match direto continuar funcionando — a busca por carga deve agregar todas as OCs daquele `carga_id` antes de consultar.
- **`AdiantamentosTab.tsx`** (agrupamento por OC): quando o tipo é "Por Ordem de Carga", listar **todas as OCs distintas** da carga e permitir gerar 1 adiantamento por OC (ou agregar todas em um só, à escolha). UI ganha um seletor extra quando a carga tem >1 OC.
- **`CtesDacteTab.tsx`** (coluna OC): exibir todas as OCs da carga vinculada, separadas por vírgula.

### Sem mudanças de banco

- A coluna `ordem_carga` continua `text` (uma por linha de pedido). Não precisa migration nem nova tabela.
- O agrupamento por OC nos relatórios e adiantamentos passa a ser feito por `DISTINCT ordem_carga WHERE carga_id = X`.

### Detalhes técnicos

- Tipo do `onSubmit` já aceita `ordem_carga?: string` por update — basta passar o valor por grupo.
- O `canSubmit` muda para: modo único exige `ordemCarga` preenchida; modo por-grupo exige ao menos uma OC preenchida em qualquer grupo.
- Reset ao abrir: `setOrdemCargaPorGrupo({})`, `setModoOc("unica")`.
- Layout do input por linha: `w-24` à direita do peso, em telas mobile vira segunda linha do card.

### Arquivos afetados

- `src/components/dashboard/FechamentoLoteDialog.tsx` (UI + estado + submit)
- `src/hooks/useCtesDacte.ts` (vinculação por lista de OCs)
- `src/components/logistica/AdiantamentosTab.tsx` (agrupamento múltiplo por OC)
- `src/components/logistica/CtesDacteTab.tsx` (exibição da lista de OCs)
- `src/components/dashboard/CargaPrintDialog.tsx` (mostrar lista de OCs no cabeçalho)
