

# Filtros Cascata + Fechamento em Lote com Ordem de Entrega

## Parte 1: Filtros Cascata (Inteligentes)

### Problema
Atualmente os filtros derivam opções do dataset completo do dia (`carregamentos`). Se o usuário filtra por vendedor, os filtros de Cliente e UF ainda mostram todas as opções do dia, não só as do vendedor selecionado.

### Solução

**`src/components/dashboard/Filters.tsx`**
- Em vez de derivar opções do `carregamentos` bruto, aplicar filtros em cascata: cada filtro subsequente usa o dataset já filtrado pelos filtros anteriores.
- Ordem de cascata: **Vendedor → Cliente → UF → Tipo Caminhão → Ruptura**
- Exemplo: se filtrei vendedor "João", o filtro de clientes mostra apenas clientes que têm pedidos do João naquele dia.

Lógica:
```text
afterVendedor = carregamentos filtrado por vendedor (se selecionado)
afterCliente  = afterVendedor filtrado por cliente (se selecionado)
afterUf       = afterCliente filtrado por UF (se selecionado)

opções de Cliente  = extraídas de afterVendedor
opções de UF       = extraídas de afterCliente
opções de Tipo     = extraídas de afterUf
```

**Arquivo editado:** `src/components/dashboard/Filters.tsx`

---

## Parte 2: Fechamento em Lote (Fechar Carreta)

### Problema
Não existe funcionalidade para agrupar pedidos selecionados como um "lote" (carreta) e definir a ordem de entrega de cada um.

### Solução

#### 2.1 — Nova coluna no banco

**Migração SQL:**
- Adicionar `ordem_entrega integer` na tabela `carregamentos_dia` (nullable, default null)

#### 2.2 — Diálogo de Fechamento de Lote

**Novo componente: `src/components/dashboard/FechamentoLoteDialog.tsx`**
- Abre quando o usuário clica "Fechar Carreta" no banner de seleção
- Mostra a lista dos pedidos selecionados com campos de logística compartilhados (tipo caminhão, placa, motorista)
- Cada pedido tem um campo numérico "Ordem de Entrega" (1, 2, 3...)
- Permite reordenar arrastando ou digitando o número
- Ao confirmar: atualiza todos os pedidos selecionados com os dados de logística + ordem de entrega + etapa "logistica"

#### 2.3 — Integração no Index.tsx

**`src/pages/Index.tsx`**
- No banner de seleção, adicionar botão "Fechar Carreta" (visível para admin e logística)
- Ao clicar, abre o `FechamentoLoteDialog` com os pedidos selecionados
- O submit faz N chamadas de update (uma por pedido) com `tipo_caminhao`, `placa`, `motorista`, `ordem_entrega`, `etapa: "logistica"`

#### 2.4 — Exibir ordem de entrega na tabela

**`src/components/dashboard/CarregamentoTable.tsx`**
- Mostrar coluna "Ordem" quando houver valor em `ordem_entrega`
- Badge discreto ao lado do cliente

### Arquivos editados/criados
- `src/components/dashboard/Filters.tsx` — filtros cascata
- `src/components/dashboard/FechamentoLoteDialog.tsx` — novo
- `src/pages/Index.tsx` — botão "Fechar Carreta" + integração
- `src/components/dashboard/CarregamentoTable.tsx` — exibir ordem de entrega
- Migração SQL — coluna `ordem_entrega`

