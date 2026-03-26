
# Auditoria Completa do Projeto — Etapa 2 de 2

Revisão linha por linha de todos os componentes restantes: Dashboard dialogs, Portaria sub-components, hooks, e CSS/responsividade.

---

## Problemas Encontrados

### 21. BUG — `CarregamentoDialog` fecha antes de todas as mutações completarem

**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx` linhas 140-178
**Problema:** `handleSubmit` chama `onSubmit()` múltiplas vezes em loop (para multi-item) e depois `onOpenChange(false)` imediatamente. Como `onSubmit` chama `updateMut.mutate()` ou `createMut.mutate()`, as mutações são assíncronas. O dialog fecha antes que as mutações concluam. Se alguma falhar, o usuário não vê o erro porque o dialog já fechou.
**Severidade:** Media
**Correção:** Usar `mutateAsync` + `Promise.all` ou fechar apenas no `onSuccess`.

---

### 22. BUG — `CarregamentoDialog` useEffect deps incompletas

**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx` linha 86
**Problema:** `useEffect` depende de `[editing, open, selectedDate]` mas usa `vendedores`, `produtos` e `defaultRuptura` internamente. Se `vendedores` carregar DEPOIS do dialog abrir, o `codigoVendedorInput` não será preenchido. Na prática funciona porque `open` re-dispara, mas é frágil.
**Severidade:** Baixa

---

### 23. BUG — `FechamentoLoteDialog` não propaga `nome_carga` quando gerado automaticamente

**Arquivo:** `src/components/dashboard/FechamentoLoteDialog.tsx` linha 79
**Problema:** `const cargaId = nomeCarga || \`CG-...\``. Quando `nomeCarga` está vazio, o `cargaId` gerado automaticamente **não** é passado como `nome_carga` nos updates (linha 93: `...(nomeCarga ? { nome_carga: nomeCarga } : {})`). Resultado: o registro tem `carga_id` mas `nome_carga` fica null. No Consolidado e nos filtros, aparece o `carga_id` criptíco em vez de um nome amigável.
**Severidade:** Media
**Correção:** Sempre setar `nome_carga: nomeCarga || cargaId`.

---

### 24. BUG — `ConsolidadoPrintDialog` dataFormatada crashea com range

**Arquivo:** `src/components/dashboard/ConsolidadoPrintDialog.tsx` linha 74
**Problema:** `data.data` pode ser `"2026-03-20 a 2026-03-26"` (range). O `split("-")` retorna 5+ elementos, causando data formatada errada como `03/20 a 2026/2026`.
**Severidade:** Media
**Correção:** Verificar se `data.data` contém " a " e formatar cada parte separadamente.

---

### 25. BUG — `RupturasPrintDialog` mesmo problema de dataFormatada com range

**Arquivo:** `src/components/dashboard/RupturasPrintDialog.tsx` linha 80
**Problema:** Idêntico ao #24. `data.data` pode ser range.
**Severidade:** Media
**Correção:** Mesma solução do #24.

---

### 26. UX — `EvidenciasViewer` sem `DialogDescription`

**Arquivo:** `src/components/portaria/EvidenciasViewer.tsx` linha 14
**Problema:** Falta `DialogDescription` para acessibilidade.
**Severidade:** A11Y Baixa
**Correção:** Adicionar `<DialogDescription className="sr-only">...</DialogDescription>`.

---

### 27. UX — `PhotoViewerDialog` renderiza null quando url é null (early return antes do Dialog)

**Arquivo:** `src/components/portaria/PhotoViewerDialog.tsx` linha 13
**Problema:** `if (!url) return null;` antes do `<Dialog>`. Quando `url` muda de não-null para null, o Dialog não tem chance de animar o fechamento. O componente simplesmente desaparece. Deveria usar `open={open && !!url}` no Dialog em vez de early return.
**Severidade:** UX Baixa
**Correção:** Remover early return, usar `open={open && !!url}`.

---

### 28. BUG — `CarregamentoTable` grupo expandido perde referência ao re-sort

**Arquivo:** `src/components/dashboard/CarregamentoTable.tsx` linha 262
**Problema:** `expanded` guarda `codigoCliente` como key. Ao mudar sort, os groups são recriados e `codigoCliente` permanece válido — OK. Mas `expanded` nunca é limpo quando `data` muda. Se o filtro muda e um `codigoCliente` desaparece, `expanded` mantém IDs órfãos indefinidamente.
**Severidade:** Baixa (memory leak leve, mesmo problema do Consolidado #9)

---

### 29. PERF — `CarregamentoTable` recria `sortAccessors` desnecessariamente

**Arquivo:** `src/components/dashboard/CarregamentoTable.tsx` linha 271
**Problema:** `sortAccessors` é criado com `useMemo(() => ({...}), [])` — correto, deps vazias. OK, sem problema real.
**Severidade:** Nenhuma — falso alarme.

---

### 30. BUG — `Consolidado.tsx` StatusSelect no mobile não previne propagação

**Arquivo:** `src/pages/Consolidado.tsx` linhas 377-379
**Problema:** O `StatusSelect` no card mobile está envolvido em `<div onClick={(e) => e.stopPropagation()}>` — OK, funciona. Sem bug.
**Severidade:** Nenhuma — já tratado.

---

### 31. UX — `RotaMap` marker icons são recriados a cada render

**Arquivo:** `src/components/dashboard/RotaMap.tsx` linha 454
**Problema:** `createMarkerIcon(p.ordem, type)` é chamado dentro do map render. Cada render cria novos `L.divIcon` objects. Leaflet compara por referência, então cada render força re-render dos markers.
**Severidade:** Performance Baixa
**Correção:** Memoizar icons por `(num, type)` key.

---

### 32. BUG — `Consolidado.tsx` dateRange.to pode ser undefined temporariamente

**Arquivo:** `src/pages/Consolidado.tsx` linha 121
**Problema:** Mesmo issue do Portaria (#20 Etapa 1). `dateToStr` fallback para `dateFromStr` quando `to` é undefined. Correto. Sem bug.
**Severidade:** Nenhuma — já tratado com fallback.

---

### 33. CSS — Print styles usam hardcoded class `printing-carga`

**Arquivo:** `src/index.css` (preciso verificar)
**Problema:** `CargaPrintDialog`, `ConsolidadoPrintDialog`, `RupturasPrintDialog` todos usam `document.body.classList.add("printing-carga")` e clonam content para `#carga-print-root`. Se dois print dialogs abrem em sequência rápida, o `cleanup` do primeiro pode remover o root do segundo.
**Severidade:** Edge case Baixa — operação sequencial, não simultânea.

---

### 34. UX — `Filters.tsx` busca só filtra por produto, não por cliente/cidade

**Arquivo:** `src/components/dashboard/Filters.tsx` linha 237
**Problema:** O placeholder diz "Buscar produto..." e o filtro em `Index.tsx` linha 130 só verifica `nome_produto` e `codigo_produto`. Não busca por `cliente`, `cidade`, `motorista`, ou `nome_carga`.
**Severidade:** UX Media
**Correção:** Expandir busca em `Index.tsx` para incluir `cliente`, `motorista`, `cidade`, `nome_carga`. Atualizar placeholder.

---

### 35. BUG — `CarregamentoDialog` modo "editar" com multi-items cria duplicatas

**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx` linhas 153-164
**Problema:** Quando `editing` existe e `items.length > 1`, o loop chama `onSubmit` para cada item. O primeiro item usa `editing.id` (update), mas items subsequentes **não** têm ID — serão tratados como criação (sem `id`). Resultado: editar e adicionar um segundo produto cria um novo registro duplicado.
**Severidade:** Baixa — multi-item editing é raro e items.length é quase sempre 1 quando editing.

---

### 36. UX — `KanbanView` cards não mostram número do pedido

**Arquivo:** `src/components/dashboard/KanbanView.tsx` linha 46
**Problema:** Os cards Kanban mostram produto, vendedor, peso, placa, cidade. Mas **não** mostram `numero_pedido`. No modo tabela, o pedido é visível. No Kanban, não há como identificar qual pedido específico é cada card.
**Severidade:** UX Media
**Correção:** Adicionar `c.numero_pedido` ao card.

---

### 37. UX — `PlacaInput` autocomplete não funciona com placas minúsculas digitadas

**Arquivo:** `src/components/portaria/PlacaInput.tsx` linha 18
**Problema:** `formatPlaca` converte para uppercase. O `usePlacaAutocomplete` recebe o valor já uppercase. OK, sem bug. Funciona corretamente.
**Severidade:** Nenhuma.

---

### 38. A11Y — `CapturaFoto` imagem preview sem lazy loading

**Arquivo:** `src/components/portaria/CapturaFoto.tsx` linha 57
**Problema:** `<img src={preview}...>` — preview de câmera local não precisa lazy loading (é blob URL). Sem problema.
**Severidade:** Nenhuma.

---

## Resumo de Issues Reais (excluindo falsos alarmes)

| # | Tipo | Severidade | Arquivo Principal |
|---|---|---|---|
| 23 | BUG | MEDIA | FechamentoLoteDialog.tsx (nome_carga null) |
| 24 | BUG | MEDIA | ConsolidadoPrintDialog.tsx (dataFormatada range) |
| 25 | BUG | MEDIA | RupturasPrintDialog.tsx (dataFormatada range) |
| 34 | UX | MEDIA | Index.tsx + Filters.tsx (busca limitada) |
| 36 | UX | MEDIA | KanbanView.tsx (sem numero_pedido) |
| 21 | BUG | MEDIA | CarregamentoDialog.tsx (close before mutations) |
| 26 | A11Y | BAIXA | EvidenciasViewer.tsx |
| 27 | UX | BAIXA | PhotoViewerDialog.tsx (early return) |
| 31 | PERF | BAIXA | RotaMap.tsx (marker icons) |
| 28 | MEM | BAIXA | CarregamentoTable.tsx (expanded orphans) |
| 35 | BUG | BAIXA | CarregamentoDialog.tsx (multi-item edit) |

## Arquivos a Editar

| Arquivo | Itens |
|---|---|
| `src/components/dashboard/FechamentoLoteDialog.tsx` | #23 |
| `src/components/dashboard/ConsolidadoPrintDialog.tsx` | #24 |
| `src/components/dashboard/RupturasPrintDialog.tsx` | #25 |
| `src/pages/Index.tsx` | #34 |
| `src/components/dashboard/Filters.tsx` | #34 |
| `src/components/dashboard/KanbanView.tsx` | #36 |
| `src/components/portaria/EvidenciasViewer.tsx` | #26 |
| `src/components/portaria/PhotoViewerDialog.tsx` | #27 |
| `src/components/dashboard/RotaMap.tsx` | #31 |

Posso implementar todas as correções de uma vez.
