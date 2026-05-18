## Pré-carga (carga em rascunho)

Permitir montar toda a estrutura de uma carga (pedidos selecionados, veículo, motorista, transportadora, rota, ordem de entrega, nome da carga, etc.) e salvar como **pré-carga**, sem disparar o fechamento. Depois, a pré-carga é reaberta no dialog de fechamento já pré-preenchida para o usuário revisar e finalizar.

### Comportamento aprovado
- **Onde criar:** botão "Salvar pré-carga" dentro do `FechamentoLoteDialog` (ao lado de "Fechar carga") **e** botão "Criar pré-carga" no Dashboard quando há pedidos selecionados.
- **Estado dos pedidos:** ficam **reservados/bloqueados** — saem da lista de "Vendas" e vão para uma seção "Pré-cargas". Não podem ser selecionados em outra carga.
- **Finalização:** botão "Finalizar" na pré-carga reabre o `FechamentoLoteDialog` já pré-preenchido com todos os campos salvos; usuário revisa e confirma para virar carga real (`etapa = logistica`).
- **Campos obrigatórios:** todos opcionais ao salvar a pré-carga; validação tradicional só na hora de finalizar.

### Estrutura

**Nova etapa:** `etapa = 'pre_carga'` em `carregamentos_dia`.
- Some das listas de Vendas/Logística atuais (filtros já excluem etapas != `vendas`/`logistica`, então um `'pre_carga'` novo será naturalmente invisível nessas telas).
- Identificada por `carga_id` com prefixo `PRE-<timestamp>` para não colidir com cargas finalizadas.
- Campos salvos diretamente nas linhas: `placa`, `motorista`, `transportadora`, `tipo_caminhao`, `nome_carga`, `ordem_carga`, `horario_previsto`, `data`, `ordem_entrega`.
- Roteirização (`rotas_executadas`) salva normalmente com o `carga_id` PRE- (já existe e é compatível).

### Mudanças no Dashboard (`src/pages/Index.tsx`)
1. **Bloqueio de seleção:** o `useMemo` que monta a lista de pedidos selecionáveis ignora linhas com `etapa = 'pre_carga'`.
2. **Botão "Criar pré-carga":** ao lado do "Fechar carga" no toolbar de seleção; abre o `FechamentoLoteDialog` em modo `pre`.
3. **Seção "Pré-cargas":** novo card colapsável (acima de "Logística") listando pré-cargas agrupadas por `carga_id`, mostrando nome da carga, qtd pedidos, peso total, veículo, destino. Cada linha tem ações:
   - **Finalizar** → abre `FechamentoLoteDialog` em modo `finalize` com os itens da pré-carga pré-selecionados e campos preenchidos.
   - **Editar** → mesmo dialog em modo `pre` para alterar campos/itens.
   - **Cancelar** → confirmação + reverte `etapa` para `vendas` e limpa `carga_id`/campos logísticos.

### Mudanças no `FechamentoLoteDialog`
- Nova prop `mode: 'fechar' | 'pre' | 'finalize'` (default `'fechar'`).
- Em `pre`/`finalize`, pré-preencher state a partir do primeiro item (já há padrão de leitura via `items`).
- Botão primário:
  - `fechar`: "Fechar carga" (comportamento atual, `etapa = logistica`).
  - `pre`: "Salvar pré-carga" (envia `etapa = 'pre_carga'`, `carga_id = PRE-...`).
  - `finalize`: "Finalizar carga" (atualiza `etapa = 'logistica'`, substitui `carga_id` PRE- pelo definitivo via mesma lógica de geração já existente).
- Validações de campos vazios desligadas no modo `pre`.

### Migração necessária
Atualizar política RLS / triggers que filtram por etapa para reconhecer `'pre_carga'` (apenas leitura — nenhuma policy restringe pelo valor `etapa` exceto a do vendedor, que não é afetada). Sem alteração de schema; apenas documentar o novo valor.

### Arquivos afetados
- `src/components/dashboard/FechamentoLoteDialog.tsx` — modos, validações, label do botão.
- `src/pages/Index.tsx` — botão "Criar pré-carga", abertura do dialog em modos diferentes, bloqueio de seleção.
- `src/hooks/useCarregamentos.ts` — helper `usePreCargas()` (filtro `etapa = 'pre_carga'`, agrupado por `carga_id`); atualizar filtros existentes para não contar pré-cargas em KPIs de Vendas/Logística.
- `src/components/dashboard/PreCargasPanel.tsx` *(novo)* — listagem com ações Finalizar / Editar / Cancelar.

### Fora do escopo
- Notificações realtime específicas de pré-carga.
- Histórico/auditoria de quem montou a pré-carga (audit_log atual já cobre via updates).
- Impressão de manifesto antes da finalização.
