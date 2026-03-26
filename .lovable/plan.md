

# Auditoria Completa — Aba Portaria

## Problemas Identificados e Melhorias Propostas

---

### 1. BUG — Retorno de Carga Própria não calcula KM Rodado corretamente

**Problema:** No `handleSave` do `RegistroMovimentoDialog`, o cálculo `km_rodado = km_final - km_inicial` usa `values.km_inicial` e `values.km_final` do mesmo formulário. Mas no retorno (saída), o `km_inicial` não está no formulário (está oculto na `VISIBILITY_SAIDA`), então `values.km_inicial` é `undefined`. O KM Rodado é salvo como `null`.

**Correção:** Quando `tipo === "saida"` e `prefill` existe, usar `prefill.km_inicial` (da entrada vinculada) para calcular `km_rodado = km_final - prefill.km_inicial`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Linha ~115: usar `prefill?.km_inicial` quando `tipo === "saida"` |

---

### 2. BUG — KM Rodado display no formulário de retorno nunca aparece

**Problema:** O bloco de KM Rodado (linha ~345) verifica `values.km_final && values.km_inicial`, mas no retorno `km_inicial` não está nos `values` (campo oculto). O display nunca renderiza.

**Correção:** Quando `tipo === "saida"`, usar `prefill?.km_inicial` para exibir o cálculo.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Linha ~345: considerar `prefill?.km_inicial` para o display |

---

### 3. BUG — Pátio Atual não mostra informações relevantes por categoria

**Problema:** Cards do pátio mostram Motorista/Empresa/Setor para todas as categorias, mas visitantes e prestadores têm `nome_completo`, `pessoa_visitada`, `servico_executar` que não aparecem. Um visitante aparece como "Placa: — | Motorista: —" sem nenhuma informação util.

**Correção:** Exibir campos relevantes da categoria: `nome_completo` para visitantes/prestadores, `rota` para carga própria, `servico_executar` para prestadores.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Adicionar campos condicionais por categoria nos cards/tabela |

---

### 4. UX — Sem feedback visual de "N° Lacre obrigatório" no retorno

**Problema:** No retorno de Carga Própria, `numero_lacre` é `"obrigatorio"` mas o formulário não destaca visualmente que campos obrigatórios estão faltando. O botão "Registrar Retorno" fica desabilitado sem explicação clara.

**Correção:** Adicionar um resumo de campos obrigatórios pendentes no footer do dialog.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Adicionar texto "X campos obrigatórios pendentes" antes do botão |

---

### 5. PERFORMANCE — Histórico faz O(n²) para agrupar movimentos

**Problema:** No `HistoricoTab`, o `useMemo` usa `movimentacoes.find()` dentro de um loop, resultando em complexidade O(n²). Com muitos registros, isso impacta performance.

**Correção:** Usar um `Map` pré-indexado por `id` para lookup O(1).

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | Criar `Map<id, MovimentacaoPortaria>` antes do loop de agrupamento |

---

### 6. UX — Sem paginação no Histórico

**Problema:** Se o período selecionado é "Este mês", potencialmente centenas de registros são renderizados de uma vez. Sem paginação, o scroll é infinito e o DOM pesado.

**Correção:** Adicionar paginação simples (20-30 itens por página) ou "Carregar mais".

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | Adicionar estado de paginação e limitar renderização |

---

### 7. UX — Sem exportação de dados

**Problema:** Nenhuma opção de exportar os dados da portaria (CSV/PDF). Para auditoria e relatórios operacionais, isso é essencial.

**Correção:** Adicionar botão "Exportar CSV" no header do Histórico com os dados filtrados.

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Botão de exportação no header do card Histórico |
| `src/components/portaria/HistoricoTab.tsx` | Expor dados filtrados para o parent |

---

### 8. UX — Sem indicação de "Rota" na aba Pátio para Carga Própria

**Problema:** Para Carga Própria, o campo `rota` é obrigatório na entrada, mas não aparece na tabela do pátio nem nos cards mobile. O operador não sabe qual rota o veículo está fazendo.

**Correção:** Adicionar coluna "Rota" na tabela desktop e campo nos cards mobile (só para `carga_propria`).

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Adicionar rota na renderização |

---

### 9. UX — KPIs não refletem período multi-dia

**Problema:** Os KPI labels dizem "Entradas Hoje" e "Retornos Hoje", mas se o usuário seleciona "Últimos 7 dias" ou "Este mês", os números são do período todo e o label fica incorreto.

**Correção:** Mudar labels para "Entradas" e "Retornos" (sem "Hoje"), ou passar o range de datas e ajustar dinamicamente.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PortariaKpiCards.tsx` | Receber prop `isToday` ou `dateLabel`, ajustar labels |
| `src/pages/Portaria.tsx` | Passar informação do range |

---

### 10. SEGURANÇA — Saída rápida não exige confirmação dupla em mobile

**Problema:** No mobile, o botão "Retorno" abre confirmação inline, mas um toque acidental pode confirmar a saída. O fluxo é: toque "Retorno" → toque "Confirmar" (dois toques consecutivos no mesmo lugar).

**Correção:** Mover o botão "Confirmar" para posição diferente do "Retorno" para evitar double-tap acidental.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Reorganizar layout dos botões de confirmação |

---

### 11. UX — Sem busca por nome/documento no filtro de busca

**Problema:** O campo de busca filtra por `placa`, `motorista`, `empresa`. Mas para visitantes e prestadores, os campos relevantes são `nome_completo`, `documento`, `pessoa_visitada`. Essas categorias são invisíveis na busca.

**Correção:** Expandir o filtro de busca para incluir `nome_completo`, `documento`, `pessoa_visitada`, `servico_executar`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Expandir condição de busca |
| `src/components/portaria/HistoricoTab.tsx` | Expandir condição de busca |

---

### 12. UX — Sem ordenação nas tabelas

**Problema:** As tabelas do Pátio e Histórico não permitem ordenação por coluna. O operador pode querer ordenar por tempo no pátio, por placa, ou por categoria.

**Correção:** Usar `useSortableTable` (já existe no projeto) nas tabelas da portaria.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Integrar `useSortableTable` |
| `src/components/portaria/HistoricoTab.tsx` | Integrar `useSortableTable` |

---

### 13. BUG — Memory leak no CapturaFoto

**Problema:** `URL.createObjectURL(file)` na linha 22 do `CapturaFoto` nunca é revogado com `URL.revokeObjectURL`. Cada foto capturada aloca memória no browser que nunca é liberada.

**Correção:** Revogar a URL anterior no `handleChange` e no cleanup do componente.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/CapturaFoto.tsx` | Adicionar `useEffect` cleanup e revogar URL anterior |

---

### 14. UX — Sem indicação de N° Lacre no Pátio/Histórico/Detalhes para retorno

**Problema:** O N° Lacre agora é obrigatório no retorno de Carga Própria, mas o campo `numero_lacre` do registro de saída não é propagado para o `handleSave` do retorno porque `values.numero_lacre` é incluído mas `km_inicial` não é herdado do prefill.

**Correção:** Já coberto pela correção #1, mas garantir que no `MovimentoDetailsDialog` o lacre do retorno (`s?.numero_lacre`) apareça destacado.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Já exibe `m.numero_lacre || s?.numero_lacre` — OK |

---

### 15. UX — Sem "Limpar filtros" na portaria

**Problema:** Se o usuário seleciona uma categoria e busca algo, não há botão para resetar todos os filtros de uma vez.

**Correção:** Adicionar botão "Limpar" que aparece quando há filtros ativos.

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Botão condicional "Limpar filtros" na barra de filtros |

---

## Priorização (Impacto x Esforço)

| # | Tipo | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| 1 | BUG | Alto | Baixo | P0 |
| 2 | BUG | Medio | Baixo | P0 |
| 3 | UX | Alto | Medio | P1 |
| 5 | PERF | Medio | Baixo | P1 |
| 9 | UX | Medio | Baixo | P1 |
| 11 | UX | Alto | Baixo | P1 |
| 13 | BUG | Baixo | Baixo | P1 |
| 4 | UX | Medio | Baixo | P2 |
| 6 | UX | Medio | Medio | P2 |
| 7 | UX | Alto | Medio | P2 |
| 8 | UX | Medio | Baixo | P2 |
| 10 | SEG | Baixo | Baixo | P2 |
| 12 | UX | Medio | Medio | P3 |
| 15 | UX | Baixo | Baixo | P3 |
| 14 | — | — | — | Já funciona |

Posso implementar todas as correções P0 e P1 de uma vez (itens 1, 2, 3, 5, 9, 11, 13), ou posso fazer por grupo de prioridade. O que prefere?

