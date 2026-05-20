## Visão geral

Transformar **Recebimento MP** num módulo completo e à prova de erro, organizado em sub‑páginas (abas) dentro de `/recebimento-mp`, com painel operacional, histórico, dashboard analítico, cadastros (motoristas, fornecedores, produtos) e correção do cálculo R$/ton (peso em **toneladas**, nunca kg). Sem mudanças de schema — todas as tabelas necessárias já existem.

## Arquitetura final

```text
/recebimento-mp
 ├─ [ Operação ]      ← painel do dia (atual)
 ├─ [ Histórico ]     ← todas as descargas com filtros
 ├─ [ Dashboard ]     ← KPIs, gráficos, rankings
 ├─ [ Motoristas ]    ← agregado por motorista + drawer de histórico
 ├─ [ Fornecedores ]  ← CRUD fornecedores_mp
 └─ [ Produtos ]      ← CRUD produtos_mp
```

## 5 Fases × 20 Etapas

---

### **FASE 1 — Correção crítica do cálculo (R$/ton)**

> Resolve o bug “4000 × 35 = 140.000” antes de qualquer outra mudança.

1. **Util central de peso** — criar `src/lib/peso-mp.ts` com `normalizarParaTon(valor, unidade)`, `detectarUnidade(valorMedio)` e `formatarTon(n)`. Centraliza toda conversão kg ↔ ton.
2. **Conferência com seletor de unidade** — em `ConferenciaDescargaDialog`, adicionar coluna “Unid.” por linha (`ton` padrão / `kg`). Mostrar preview “= 4,000 ton” ao lado quando `kg`. Salva sempre em ton.
3. **Validação anti‑erro** — se usuário digitar valor `> 100` com unidade `ton`, abrir confirmação inline: “Tem certeza? Parece estar em kg. [Converter para ton] [Manter]”.
4. **Importador resiliente** — em `ImportarRecebimentosMpDialog`, detectar automaticamente kg (média dos pesos > 100) e converter, exibindo aviso no preview com toggle manual “Tratar como kg”.

---

### **FASE 2 — Reestruturação em abas**

> Sem perder nada do que já existe.

5. **Extrair Operação do Dia** — mover conteúdo atual de `RecebimentoMp.tsx` para `src/components/recebimento-mp/OperacaoDiaPanel.tsx` (KPIs, filtro de data, tabela, botões Registrar/Importar). Comportamento idêntico ao atual.
6. **Página com Tabs** — reescrever `src/pages/RecebimentoMp.tsx` usando `<Tabs>` (shadcn) com as 6 abas. Persistir aba selecionada em `?tab=operacao` para deep‑link e refresh.
7. **Skeleton dos demais painéis** — criar arquivos vazios (`HistoricoDescargasPanel`, `DashboardMpPanel`, `MotoristasMpPanel`, `FornecedoresMpPanel`, `ProdutosMpPanel`) renderizando placeholder “Em construção” — garante que as abas existem antes do conteúdo.
8. **Responsividade das tabs** — em mobile, abas viram select dropdown; em desktop, tabs horizontais com ícones.

---

### **FASE 3 — Histórico completo de descargas**

9. **Hook de histórico paginado** — `src/hooks/useRecebimentosMpHistorico.ts` com filtros `{ de, ate, fornecedorId, motorista, placa, status, page }`. Paginação server‑side (50/página). Inclui totais agregados.
10. **Painel de Histórico** — `HistoricoDescargasPanel.tsx`: filtros sticky no topo (período padrão últimos 30d, fornecedor, motorista, placa, status), tabela com sticky header, rodapé com totais (nº descargas, ton, R$).
11. **Drill‑down** — clicar numa linha abre `ConferenciaDescargaDialog` (modo somente‑leitura quando `pago`) ou `PagamentoDialog` conforme status. Botão imprimir recibo em cada linha.
12. **Exportar XLSX** — botão “Exportar período” gera planilha com cabeçalho + itens detalhados (uma aba por descarga + aba resumo).

---

### **FASE 4 — Dashboard analítico + Motoristas**

13. **Hook de agregações** — `useRecebimentosMpDashboard.ts`: queries paralelas para totais do mês, série diária (30d), top fornecedores, top motoristas, breakdown de status de pagamento. Limite seguro de 5000 linhas (memória core).
14. **Dashboard MP** — `DashboardMpPanel.tsx`: KPIs (ton recebida, R$ pago, R$ pendente, nº descargas, ticket médio, pallets a devolver), gráfico de barras ton/dia (Recharts), top 5 fornecedores (barras horizontais), top 5 motoristas, pizza pago vs pendente. Cores do design system, vermelho **só** para pendências críticas.
15. **Hook de motoristas MP** — `useMotoristasMp.ts` agrega `recebimentos_mp` por (CPF || placa || nome normalizado): nº entregas, total ton, R$ acumulado, última visita, telefone, placas usadas, fornecedores atendidos.
16. **Painel Motoristas + Drawer** — `MotoristasMpPanel.tsx` com tabela ranking ordenável + busca; clique abre `MotoristaMpDetalheDrawer.tsx` com histórico completo daquele motorista (lista de descargas, KPIs pessoais, fotos de nota, recibos imprimíveis).

---

### **FASE 5 — Cadastros, polimento e qualidade**

17. **Painel Fornecedores** — `FornecedoresMpPanel.tsx`: CRUD com `useFornecedoresMp` (criar/editar nome, CNPJ/CPF, cidade/UF, telefone, e‑mail, ativo). Colunas extras: nº descargas, ton acumulada, última entrega. Confirmação obrigatória para deletar.
18. **Painel Produtos** — `ProdutosMpPanel.tsx`: CRUD `produtos_mp` (código, nome, unidade padrão `ton`, ativo). Mesma confirmação de deleção.
19. **Audit log + Realtime** — registrar ações (criação, conferência, pagamento, deleção) em `audit_log` com `entity_type='recebimento_mp'`. Manter realtime debounce 1.5s já existente. Mostrar timeline no drawer do motorista quando relevante.
20. **QA final** — checklist: (a) salvar peso em kg vira ton correto; (b) recibo impresso bate com tabela; (c) tabs preservam estado no refresh; (d) mobile (375px) sem overflow; (e) RLS testada com role `portaria` (somente operação) e `logistica/admin/faturamento` (acesso total); (f) histórico de 90 dias responde < 1s.

## Arquivos

**Criar:**
- `src/lib/peso-mp.ts`
- `src/components/recebimento-mp/OperacaoDiaPanel.tsx`
- `src/components/recebimento-mp/HistoricoDescargasPanel.tsx`
- `src/components/recebimento-mp/DashboardMpPanel.tsx`
- `src/components/recebimento-mp/MotoristasMpPanel.tsx`
- `src/components/recebimento-mp/MotoristaMpDetalheDrawer.tsx`
- `src/components/recebimento-mp/FornecedoresMpPanel.tsx`
- `src/components/recebimento-mp/ProdutosMpPanel.tsx`
- `src/hooks/useRecebimentosMpHistorico.ts`
- `src/hooks/useRecebimentosMpDashboard.ts`
- `src/hooks/useMotoristasMp.ts`

**Editar:**
- `src/pages/RecebimentoMp.tsx` (vira shell com Tabs)
- `src/components/recebimento-mp/ConferenciaDescargaDialog.tsx` (unidade kg/ton + validação)
- `src/components/recebimento-mp/ImportarRecebimentosMpDialog.tsx` (detecção automática kg)
- `src/hooks/useFornecedoresMp.ts` (add update/delete se faltar)

## Fora de escopo

- Mudanças de schema (todas as tabelas já cobrem o caso).
- Integração com Portaria (vínculo `vinculo_movimentacao_portaria_id` já existe; não muda agora).
- Tabela dedicada de “motoristas MP” — usaremos agregação dos recebimentos; cadastro avulso fica para a v2 se necessário.
- Notificações realtime para faturamento (entram no roadmap v3 separado).
