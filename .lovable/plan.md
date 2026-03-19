

## Plan: Filtrar Painel e Permitir Adicionar Pedidos a Cargas Logística OK

### O que muda

1. **Esconder itens "Logística OK" do Painel**: No filtro da view principal (`Index.tsx`), itens com `etapa === "logistica"` serão ocultados, exibindo apenas pedidos "Pendente Logística". Isso se soma ao filtro existente que já oculta itens finalizados (carga_id + Carregado).

2. **Manter "Adicionar à Carga" funcionando**: O cálculo de `cargasFechadas` já usa `carregamentos` (dados completos, sem filtro). Vamos expandir essa lógica para incluir também agrupamentos de itens com `etapa === "logistica"` que compartilhem dados de transporte (placa/motorista), mesmo que não tenham `carga_id` formal. Isso permite que o usuário selecione pedidos pendentes e os vincule a uma carga já montada.

3. **Botão "Add Carga" sempre visível quando há cargas disponíveis**: Atualmente o botão "Add Carga" só aparece quando há itens selecionados E cargas fechadas. Vamos mantê-lo visível com seleção, mas garantir que cargas logística-ok apareçam na lista.

### Arquivos alterados

- **`src/pages/Index.tsx`**:
  - Linha ~108 do `filtered`: adicionar `if (c.etapa === "logistica") return false`
  - Ajustar `cargasFechadas` para incluir itens logistica com `carga_id` (já funciona) e possivelmente itens logistica agrupados por placa
  - Atualizar contagem de finalizados para incluir itens logistica-ok

- **`src/components/dashboard/KanbanView.tsx`**: O filtro de `RUPTURA_STATUSES` já existe; adicionar filtro para esconder `etapa === "logistica"`

- **`src/components/dashboard/KpiCards.tsx`**: Remover o card "Pend. Logística" (já que todos os itens visíveis serão pendentes) ou mantê-lo como referência — a decidir, mas o total refletirá apenas pendentes

### Lógica de filtro (Index.tsx)

```text
filtered = carregamentos.filter(c => {
  // Hide logistica-ok items (visible only in Consolidado)
  if (c.etapa === "logistica") return false;
  // Hide finalized
  if (c.carga_id != null && c.status === "Carregado") return false;
  // ... existing filters
})
```

### Sem alterações no banco de dados

Nenhuma migração necessária. Apenas mudanças de UI/filtros no frontend.

