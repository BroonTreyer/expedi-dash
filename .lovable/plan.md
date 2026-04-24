

## Bug: Painel "Cargas Fechadas" duplica entrada quando carga é fechada vinculada a walk-in

### Diagnóstico — onde está a duplicação

Em `/portaria/registro-entrada` aparecem hoje **dois cards** mostrando o mesmo veículo:

1. **Card vermelho/amarelo** (`SolicitacoesPendentesPanel`) — alimentado por `useVeiculosWalkInAtivos`, lista walk-ins com `status_autorizacao IN ('aguardando_vinculo','autorizado')` e `conferido = false`.
2. **Card azul** (`CargasFechadasAguardandoPanel`) — alimentado por `useCargasFechadasAguardando`, lista cargas com `etapa = 'logistica'` cujo `carga_id` **não tem nenhuma `movimentacoes_portaria` registrada**.

Quando a Logística fecha uma carga vinculando a placa ao walk-in:
- O **trigger `on_carga_fechada`** já faz a coisa certa: detecta o walk-in da mesma placa e atualiza para `status_autorizacao = 'autorizado'` + `carga_id = NEW.carga_id` (não cria duplicata em `veiculos_esperados`). ✅
- Mas o **walk-in continua aparecendo** no card vermelho (ele faz parte do `('aguardando_vinculo','autorizado')`), agora marcado como "Liberado".
- E como **não existe `movimentacoes_portaria`** para essa carga ainda (o veículo ainda não passou pela portaria física), a carga **também aparece** no card azul.

Resultado visual: **mesmo veículo em dois cards diferentes**, com ações conflitantes ("Registrar chegada" em ambos).

O mesmo se passa quando vincular é via `useVincularWalkInACarga` (botão "Vincular Carga") — o walk-in vira `autorizado` com `carga_id` setado, mas continua listado no painel vermelho **e** a carga aparece no painel azul.

### Correção

A regra correta é: **se o walk-in já está vinculado a uma `carga_id`, o card "fonte de verdade" passa a ser o azul (Cargas Fechadas Aguardando)** — e o card vermelho deve esconder esse veículo. Assim o porteiro tem **uma única ação**: "Registrar chegada do veículo" no card azul, que cria a `movimentacao_portaria`, marca o walk-in como `conferido` e tira de tudo.

#### Mudança 1 — `src/hooks/useVeiculosEsperados.ts` (`useVeiculosWalkInAtivos`)

Excluir da listagem walk-ins **autorizados que já têm `carga_id`** (já são responsabilidade do card azul). Manter:
- `aguardando_vinculo` (sem carga ainda) → fica no vermelho para a Logística vincular
- `autorizado` **sem `carga_id`** (caso raro: liberado sem vínculo) → fica no vermelho

```ts
.eq("walk_in", true)
.eq("conferido", false)
.or("status_autorizacao.eq.aguardando_vinculo,and(status_autorizacao.eq.autorizado,carga_id.is.null)")
```

Mesma regra em `useVeiculosWalkInPendentesCount` (KPI do sino).

#### Mudança 2 — `src/components/portaria/CargasFechadasAguardandoPanel.tsx`

Mostrar um indicador quando a carga **veio de um walk-in já no pátio** (badge "Walk-in vinculado") para o porteiro reconhecer que o motorista já está esperando:

- Buscar em paralelo `veiculos_esperados` autorizados com `carga_id IN (...)` e marcar quais cargas têm walk-in.
- Adicionar badge: `<Badge>Walk-in autorizado</Badge>` no card.
- Texto do botão muda de "Registrar chegada do veículo" para "Confirmar entrada do walk-in" quando aplicável.

#### Mudança 3 — `src/components/portaria/RegistroEntradaDialog.tsx` (`handleSubmitVinculadoACarga`)

Hoje o `update` em `veiculos_esperados` busca por `carga_id` (e marca `conferido = true`). Manter — está correto. Adicionar apenas: invalidar também `veiculos_walkin_ativos` e `veiculos_walkin_pendentes_count` para o card vermelho atualizar imediatamente.

```ts
qc.invalidateQueries({ queryKey: ["veiculos_walkin_ativos"] });
qc.invalidateQueries({ queryKey: ["veiculos_walkin_pendentes_count"] });
```

### Validação

1. Criar walk-in (placa X) em `/portaria/registro-entrada`.
   - ✅ Aparece no card vermelho ("Aguardando vínculo").
2. Logística fecha carga vinculando a placa X (via painel principal).
   - ✅ Walk-in vira `autorizado` + `carga_id` (já acontece).
   - ✅ **Some do card vermelho** (correção #1).
   - ✅ Aparece **apenas no card azul** com badge "Walk-in autorizado" (correção #2).
3. Porteiro clica "Confirmar entrada do walk-in".
   - ✅ Cria `movimentacao_portaria`, marca walk-in `conferido=true`.
   - ✅ Some dos dois cards.
4. Mesmo teste via "Vincular Carga" no card vermelho — sem duplicação.

### Fora do escopo

- Mudança no trigger `on_carga_fechada` (já está correto).
- Mexer no painel `VeiculosEsperadosPanel` da página `/portaria` (aba "Esperados") — usa outro hook (`useVeiculosEsperados`) e está ok.
- Histórico / auditoria / outros painéis.

### Resultado esperado

Cada veículo aparece em **um único lugar** no Registro de Entrada, com **uma única ação** disponível, eliminando o conflito visual e operacional descrito.

