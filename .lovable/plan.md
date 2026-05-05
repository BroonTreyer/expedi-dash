## Separar CIF vs FOB em Gastos por Vendedor

Gasto de frete só faz sentido em cargas **CIF** (frete por conta do remetente). FOB é responsabilidade do cliente — não deve entrar no cálculo.

### Situação atual no banco
Distribuição de `tipo_frete` em `carregamentos_dia` com etapa logística:
- **CIF**: 58 linhas
- **FOB**: 241 linhas
- **NULL/sem informação**: 1177 linhas (maioria — pedidos antigos sem o campo preenchido)

Por isso precisamos tratar o "sem classificação" explicitamente, senão escondemos quase todos os dados.

### Mudanças no hook `useGastosVendedor.ts`

1. Incluir `tipo_frete` no SELECT de `carregamentos_dia`.
2. **Determinar tipo da carga** (uma carga inteira é CIF ou FOB, não pedido a pedido):
   - Se todos os itens com `tipo_frete` preenchido na carga forem CIF → carga CIF.
   - Se todos forem FOB → carga FOB.
   - Misto → marcar como `misto` (raríssimo, mas tratamos).
   - Nenhum item classificado → `nao_classificado`.
3. Aceitar parâmetro novo `filtroTipoFrete: "cif" | "todos" | "nao_classificado"` (default: `cif`).
4. Filtrar cargas de acordo com o parâmetro antes de acumular previsto/realizado por vendedor.
5. Anotar em cada `GastoDetalhe` o `tipo_frete_carga` para exibir badge.
6. Calcular um resumo de cobertura: quantas cargas CIF, FOB, mistas, não classificadas no período (para mostrar no UI e alertar quando há muito "não classificado").

### Mudanças na UI `GastosVendedorTab.tsx`

1. **Toggle de tipo de frete** ao lado dos filtros: `Apenas CIF` (padrão) | `Não classificado` | `Todos`.
2. **Card de cobertura** no topo: "X cargas CIF · Y FOB · Z não classificadas — considere preencher Tipo de Frete nos pedidos para precisão".
3. **Badge** na linha de cada carga expandida: `CIF` (verde), `FOB` (cinza), `MISTO` (amarelo), `?` (slate) quando não classificado.
4. KPIs de Previsto/Realizado/Divergência refletem só as cargas filtradas.

### Onde o `tipo_frete` é definido
O campo já existe em `carregamentos_dia` e é editável pelo formulário de pedidos. Não precisa migração. Como melhoria adicional opcional (NÃO incluída agora), podemos adicionar default por cliente (campo `tipo_frete_padrao` em `clientes`) — pergunta no final.

### Arquivos a editar
- `src/hooks/useGastosVendedor.ts` — adicionar lógica de classificação + filtro.
- `src/components/logistica/GastosVendedorTab.tsx` — toggle, card cobertura, badge.

### Pergunta antes de implementar
Cargas **não classificadas** (sem `tipo_frete` em nenhum item) — o que fazer no padrão?
- (A) Tratar como CIF (incluir nos gastos) — risco de inflar números.
- (B) Esconder por padrão, mostrar com toggle "Incluir não classificadas" — mais conservador, sugiro este.
- (C) Tratar como FOB (excluir totalmente).

Sugiro **(B)**: mostrar só CIF de fato + alerta de cobertura para o usuário ir classificando os pedidos. Confirmar antes de codar?
