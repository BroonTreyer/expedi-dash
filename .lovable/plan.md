

# Auditoria Completa — Aba Portaria (Rodada 2)

Revisão pós-implementação das correções anteriores. Foco em problemas remanescentes e melhorias novas.

---

## Problemas Encontrados

### 1. BUG — Exclusão no Histórico só deleta entrada, retorno fica órfão visualmente

**Problema:** `useDeleteMovimentacao` deleta registros vinculados (`movimento_vinculado_id = id`) e depois o registro em si. Porém, no `HistoricoTab`, o botão "Excluir" usa `r.id` (que é `g.entrada || g.saida`). Se o grupo tem entrada + saída, exclui a entrada e seus filhos — OK. Mas se o admin quer excluir **só o retorno** (corrigir um retorno errado), não há opção. O botão sempre exclui o registro principal do grupo.

**Correção:** No `MovimentoDetailsDialog`, permitir excluir entrada ou retorno individualmente (dois botões quando ambos existem).

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Botão "Excluir Retorno" separado quando `s` existe |

---

### 2. BUG — `useMemo` com side effect no HistoricoTab

**Problema:** Linha 134: `useMemo(() => setPage(0), [search, categoriaFilter, tipoFilter])` usa `useMemo` para executar um side effect (`setPage`). Isso é um anti-pattern do React e pode causar warnings em strict mode. O `useMemo` não deve ter side effects.

**Correção:** Trocar por `useEffect`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | Linha 134: trocar `useMemo` por `useEffect` |

---

### 3. BUG — EditMovimentoDialog não recalcula km_rodado com prefill

**Problema:** Na edição (linha 67), `km_rodado` é calculado como `km_final - km_inicial` do mesmo registro. Porém, para um registro de **retorno** (saída), `km_inicial` está no registro de **entrada** vinculado, não no próprio. O admin edita o KM Final do retorno, mas o `km_rodado` não recalcula corretamente porque `km_inicial` do retorno é `null`.

**Correção:** Buscar `km_inicial` do registro de entrada vinculado quando editando um retorno. Ou: aceitar que o EditDialog é simplificado e não recalcular km_rodado automaticamente (remover o cálculo errado).

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/EditMovimentoDialog.tsx` | Remover recálculo automático de km_rodado ou buscar entrada vinculada |

---

### 4. UX — Pátio não exclui "terceirizado" do count mas exclui da lista

**Problema:** Em `Portaria.tsx` linha 58, o `counts.patio` filtra `m.categoria !== "terceirizado"`. OK. Mas no `PortariaKpiCards`, o "Veículos no Pátio" conta a mesma coisa. Porém, as "Entradas" e "Retornos" contam **todos** os registros, incluindo terceirizados. Isso gera confusão: "30 entradas mas só 5 no pátio" quando 20 são terceirizados.

**Correção:** Adicionar KPI "Terceirizados" separado ou filtrar terceirizados dos KPIs de entrada/retorno.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PortariaKpiCards.tsx` | Adicionar 4° card "Terceirizados" ou nota explicativa |

---

### 5. UX — Saída rápida não propaga campos do retorno

**Problema:** `handleSaidaRapida` no `PatioAtualTab` cria um registro de saída com campos mínimos (placa, motorista, empresa). Não propaga `nome_completo`, `documento`, `rota`, `categoria`-specific fields. O retorno rápido de um visitante perde o nome dele.

**Correção:** Propagar campos relevantes da entrada: `nome_completo`, `documento`, `rota`, `pessoa_visitada`, `servico_executar`, `tipo_operacao`, `nota_fiscal`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Expandir `handleSaidaRapida` com campos adicionais |

---

### 6. UX — CSV exporta todos os movimentos, não respeita filtros de categoria/tipo

**Problema:** `exportCSV` em `Portaria.tsx` usa `movimentacoes` diretamente (todos os dados do período). Se o usuário filtrou por "Carga Própria" e "Entradas", o CSV exporta tudo, não o filtro atual.

**Correção:** Aplicar os filtros ativos (`categoriaFilter`, `tipoFilter`, `search`) antes de gerar o CSV.

| Arquivo | Mudança |
|---|---|
| `src/pages/Portaria.tsx` | Filtrar `movimentacoes` com os mesmos critérios antes de exportar |

---

### 7. UX — Sem data completa no Histórico mobile

**Problema:** Nos cards mobile do Histórico, só mostra "HH:mm" da entrada/retorno. Se o período é "Este mês", o operador não sabe **qual dia** cada registro aconteceu.

**Correção:** Mostrar "dd/MM HH:mm" ao invés de só "HH:mm" quando o range é maior que 1 dia.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | Receber prop `isMultiDay` e ajustar formato |
| `src/pages/Portaria.tsx` | Passar prop |

---

### 8. UX — Upload de foto não indica tipo correto para painel/nota

**Problema:** `handleFotoCapture` em `RegistroMovimentoDialog` calcula `tipoFoto` como `"placa"` ou `"doc"` baseado no `fieldKey.includes("placa")`. Mas `foto_painel_url` e `foto_nota_url` não contêm "placa", então são classificados como `"doc"`. Funciona (mesma pasta), mas a organização no storage fica errada.

**Correção:** Mapear `fieldKey` para tipo correto: `foto_painel_url → "painel"`, `foto_nota_url → "nota"`, `foto_documento_url → "doc"`, `foto_placa_url → "placa"`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Expandir mapeamento de tipo de foto |
| `src/hooks/useMovimentacoesPortaria.ts` | `uploadFotoMovimentacao` aceitar mais tipos |

---

### 9. SEGURANÇA — Qualquer usuário autenticado pode excluir movimentações

**Problema:** O RLS de `movimentacoes_portaria` permite DELETE para qualquer `authenticated`. A UI restringe a admin, mas a API não. Um operador comum poderia chamar a API diretamente.

**Correção:** Adicionar RLS policy de DELETE restrito a admins usando `has_role(auth.uid(), 'admin')`.

| Arquivo | Mudança |
|---|---|
| Migration SQL | `DROP POLICY` + `CREATE POLICY` para DELETE com check de admin |

---

### 10. UX — Detalhes do movimento não mostra "Número do Lacre" destacado no retorno

**Problema:** O `MovimentoDetailsDialog` mostra `m.numero_lacre || s?.numero_lacre` na seção básica. Funciona, mas como o lacre agora é obrigatório **só no retorno** de Carga Própria, o valor vem de `s.numero_lacre`. Se não houver `s` (retorno não registrado), nunca aparece. OK lógico, mas o label "Nº Lacre/Etiqueta" não distingue se é da entrada ou retorno.

**Correção:** Quando ambos existem, mostrar separadamente: "Lacre (Entrada)" e "Lacre (Retorno)".

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Separar exibição de lacre por registro |

---

### 11. PERFORMANCE — Realtime subscription não filtra por data

**Problema:** O channel em `useMovimentacoes` escuta `event: "*"` na tabela inteira. Qualquer INSERT/UPDATE/DELETE em `movimentacoes_portaria` (mesmo de meses atrás) invalida o cache. Com muitos operadores simultâneos, gera invalidações desnecessárias.

**Correção:** Não é possível filtrar por data no Realtime do Supabase (limitação), mas pode-se usar `filter` por `tipo_movimento` ou simplesmente aceitar o comportamento atual (impacto baixo).

**Ação:** Nenhuma — manter como está. Impacto real é mínimo.

---

### 12. UX — Histórico não mostra data quando range > 1 dia (desktop)

**Problema:** No desktop, a coluna "Hora" mostra `HH:mm → HH:mm`. Quando o range é "Este mês", não há indicação do dia.

**Correção:** Mostrar `dd/MM HH:mm` na coluna quando range > 1 dia.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | Ajustar `formatHora` para incluir dia quando multi-day |

---

## Priorização

| # | Tipo | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| 2 | BUG | Medio | Baixo | P0 |
| 3 | BUG | Medio | Baixo | P0 |
| 5 | BUG | Alto | Baixo | P0 |
| 9 | SEG | Alto | Baixo | P0 |
| 6 | UX | Alto | Baixo | P1 |
| 7+12 | UX | Medio | Baixo | P1 |
| 8 | UX | Baixo | Baixo | P1 |
| 1 | UX | Medio | Medio | P2 |
| 4 | UX | Baixo | Baixo | P2 |
| 10 | UX | Baixo | Baixo | P2 |

## Resumo de arquivos a editar

| Arquivo | Itens |
|---|---|
| `src/components/portaria/HistoricoTab.tsx` | #2, #7, #12 |
| `src/components/portaria/PatioAtualTab.tsx` | #5 |
| `src/components/portaria/EditMovimentoDialog.tsx` | #3 |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | #8 |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | #1, #10 |
| `src/pages/Portaria.tsx` | #6, #7 |
| `src/hooks/useMovimentacoesPortaria.ts` | #8 |
| `src/components/portaria/PortariaKpiCards.tsx` | #4 |
| Migration SQL | #9 |

Posso implementar tudo de uma vez ou por prioridade. O que prefere?

