

## Resumo

Duas funcionalidades:

1. **Soma total do pedido** no `CarregamentoDialog` — exibir peso e quantidade totais somados de todos os itens em tempo real enquanto o usuário digita.
2. **Vínculo posterior carro ↔ pedido na Portaria** — atender os 2 cenários: (a) pedido fechado primeiro e o carro chega depois → portaria vincula; (b) carro chega primeiro (walk-in) e o pedido é fechado depois → logística vincula. O fluxo (b) já existe parcialmente; falta o (a) — botão para vincular um carro **já no pátio sem carga** a uma carga fechada, e o oposto: botão na carga fechada "Aguardando veículo" para vincular um carro que entrou.

---

## 1. Soma total do pedido no diálogo

**Arquivo:** `src/components/dashboard/CarregamentoDialog.tsx`

Adicionar abaixo da lista de itens (linha ~477, antes de "Observações") um rodapé compacto com totais derivados de `items`:

```text
┌─────────────────────────────────────────────────┐
│  TOTAL DO PEDIDO    3 produtos · 45 un · 178,5 kg │
└─────────────────────────────────────────────────┘
```

- Cálculo: `totalQtd = items.reduce((s,i) => s + (i.quantidade||0), 0)`, `totalPeso = items.reduce((s,i) => s + (i.peso||0), 0)`, `totalProdutos = items.length`.
- Formatação pt-BR (memória `style/data-formatting`): `totalPeso.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
- Atualiza automaticamente a cada mudança em peso/quantidade (já reativo via `setItems`).
- Visual: `bg-muted/30 rounded-md p-2.5` com label uppercase e valores em fonte semibold.

Nada de schema novo — totalmente derivado no client.

---

## 2. Vínculo carro ↔ pedido na Portaria (ambos os sentidos)

### Estado atual
- ✅ **Walk-in (carro chega antes do pedido):** carro entra como `walk_in=true, status=aguardando_vinculo` → Logística vê em `SolicitacoesPendentesPanel` e vincula via botão "Vincular a carga" (que hoje só leva pra `/`). Após vincular, status vira `autorizado` e Portaria libera entrada.
- ❌ **Pedido fechado antes (carro chega depois):** quando uma carga é fechada (`etapa=logistica`, `carga_id` definido), nada acontece se nenhum veículo esperado foi cadastrado. Quando o carro chega, Portaria registra entrada manual sem nenhum link automático com a carga já fechada. Falta vínculo bidirecional.

### Mudanças

#### 2a. Vincular walk-in a uma carga fechada (melhorar o fluxo existente)

**Arquivo:** `src/components/portaria/SolicitacoesPendentesPanel.tsx` (botão "Vincular a carga", linha ~146)

Hoje: `<Link to="/">Vincular a carga</Link>` — leva pra dashboard sem contexto.

Trocar por um **diálogo de seleção de carga fechada** (`VincularCargaDialog` novo):
- Lista cargas com `etapa='logistica'` e `carga_id IS NOT NULL` da data atual + 3 dias anteriores.
- Mostra: `nome_carga`, `placa prevista`, `motorista`, peso total, qtd pedidos.
- Filtro de busca por nome da carga ou placa.
- Ao selecionar: chama nova mutação `useVincularWalkInACarga({ veiculoEsperadoId, cargaId, nomeCarga, placaCarga })` que:
  1. Atualiza `veiculos_esperados`: `status_autorizacao='autorizado'`, `carga_id`, `autorizado_por/em`.
  2. Se a placa da carga for diferente da placa que chegou, atualiza `carregamentos_dia.placa` e `motorista` para os dados reais (linhas com aquele `carga_id`).
- Após vincular, o card pula automaticamente para "LIBERADO" (lógica existente) e Portaria libera entrada.

#### 2b. Painel "Cargas fechadas aguardando veículo" na página de Registro de Entrada

**Arquivo novo:** `src/components/portaria/CargasFechadasAguardandoPanel.tsx`
**Hook novo:** `useCargasFechadasAguardando` em `src/hooks/useCarregamentos.ts`

Lista cargas onde:
- `etapa='logistica'`
- `carga_id IS NOT NULL`
- Não existe entrada em `movimentacoes_portaria` com aquele `carga_id` (ou seja, veículo ainda não chegou)
- Data nas últimas 48h

Por carga mostra: `nome_carga`, `placa prevista`, `motorista previsto`, `tipo_caminhao`, peso total, qtd pedidos. Ações:
- **"Registrar chegada deste veículo"** → abre `RegistroEntradaDialog` pré-preenchido com placa/motorista/transportadora/tipo_caminhão da carga **e já com `carga_id` vinculado**, criando direto a entrada na portaria + atualiza `veiculos_esperados` se houver.
- **"Veio outro veículo"** → abre o mesmo diálogo em branco, mas mantém o `carga_id` selecionado para amarrar à entrada.

Renderizar este painel em `src/pages/RegistroEntrada.tsx` (acima de `SolicitacoesPendentesPanel`) e em `src/pages/Portaria.tsx` (acima de `VeiculosEsperadosPanel`).

#### 2c. Notificação automática quando carga é fechada sem veículo esperado

Trigger SQL `on_carga_fechada` (já existe) — adicionar lógica:
- Se ao virar `etapa='logistica'` não houver `veiculos_esperados` para aquele `carga_id`, criar registro em `veiculos_esperados`:
  - `data_referencia = CURRENT_DATE`, `grupo` = derivado do `tipo_caminhao` (PRÓPRIA/TERCEIRO), `placa`, `motorista`, `transportadora`, `tipo_veiculo`, `carga_id`, `status_autorizacao='previsto'`, `walk_in=false`.
- Já notifica Portaria via `notify_role` (adicionar nova chamada).

Assim, toda carga fechada aparece automaticamente em "Veículos Esperados" da Portaria — não depende de import de planilha.

### Permissões (memória `auth/role-management` e `auth/portaria-granular-permissions`)
- **Vincular walk-in a carga**: `admin` + `logistica` (já é).
- **Registrar chegada de carga fechada**: `admin` + `logistica` + `portaria`.
- RLS atual de `veiculos_esperados` e `carregamentos_dia` já cobre.

---

## Arquivos

**Funcionalidade 1**
- ✏️ `src/components/dashboard/CarregamentoDialog.tsx` — bloco de totais (qtd, peso, nº produtos) abaixo da lista de itens

**Funcionalidade 2**
- 🆕 `src/components/portaria/VincularCargaDialog.tsx` — modal para escolher carga fechada e vincular ao walk-in
- ✏️ `src/components/portaria/SolicitacoesPendentesPanel.tsx` — botão "Vincular a carga" abre `VincularCargaDialog` (em vez de navegar para `/`)
- 🆕 `src/components/portaria/CargasFechadasAguardandoPanel.tsx` — lista cargas fechadas sem veículo na portaria + botões de chegada
- ✏️ `src/hooks/useCarregamentos.ts` — `useCargasFechadasAguardando` + `useVincularWalkInACarga`
- ✏️ `src/components/portaria/RegistroEntradaDialog.tsx` — aceitar prop `prefill` (placa, motorista, transportadora, tipo_caminhao, carga_id) para pré-preencher
- ✏️ `src/pages/RegistroEntrada.tsx` e `src/pages/Portaria.tsx` — incluir `CargasFechadasAguardandoPanel`
- 🆕 Migration SQL — atualizar `on_carga_fechada` para criar `veiculos_esperados` automaticamente quando carga fecha sem veículo previsto + notificar portaria

**Memória**
- ✏️ `mem://features/portaria-expected-vehicles-workflow` — documentar criação automática de veículo esperado ao fechar carga + vínculo bidirecional walk-in/carga
- ✏️ `mem://features/operational-workflow` — total do pedido visível no diálogo de criação

