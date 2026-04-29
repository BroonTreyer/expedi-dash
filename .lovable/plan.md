## Problema atual

Na tela **Portaria → Terceirizado**, o painel **"Cargas fechadas aguardando veículo"** mostra um único botão (`Confirmar entrada do motorista` / `Registrar chegada do veículo`) que, ao ser clicado, **já cria a movimentação de entrada no pátio** (`tipo_movimento: "entrada"`, `etapa_terceirizado: "no_patio"`). Resultado: o motorista aparece como "no pátio" no segundo em que chega na portaria — quando na prática ele ainda fica aguardando do lado de fora antes de receber liberação para entrar.

## Objetivo

Separar o fluxo em **duas etapas explícitas** para cargas fechadas aguardando veículo:

1. **Registrar chegada** — motorista chegou na portaria mas continua **aguardando** fora do pátio (não conta como "no pátio" ainda).
2. **Liberar entrada no pátio** — depois de aguardar, o porteiro libera e aí sim o veículo aparece como "no pátio".

## Fluxo proposto

```text
[Carga fechada aguardando]
        |
        | botão "Registrar chegada"
        v
[Aguardando liberação] <-- novo estado intermediário, fica no painel
        |
        | botão "Liberar entrada no pátio"
        v
[No pátio] (entra no PatioAtualTab, KPIs etc.)
```

### Estado intermediário "Aguardando liberação"

- A linha continua visível no painel `CargasFechadasAguardandoPanel`, agora com um badge `Aguardando liberação` e mostrando `Chegou às HH:mm` + tempo decorrido (cronômetro vivo).
- Botão muda para **"Liberar entrada no pátio"** (verde/primário).
- Permanece a opção de cancelar a chegada (caso tenha sido erro) — botão secundário "Desfazer chegada".

### Como representar o estado intermediário no banco

Sem migração de schema. Usar campos já existentes em `movimentacoes_portaria`:

- **Registrar chegada** cria a linha já como `tipo_movimento = "entrada"` (mantém compatibilidade com hooks/relatórios existentes), mas com:
  - `horario_chegada = now()`
  - `horario_entrada = NULL` (chave do estado: enquanto NULL, está aguardando liberação)
  - `etapa_terceirizado = "chegada"` (já é um valor reconhecido em `useStatusPortariaPorCarga`, mapeado para `patio` lá — ajustaremos)
  - Para carga própria: `etapa_carga_propria = "aguardando_liberacao"` (novo valor textual, sem alterar enum/check).

- **Liberar entrada no pátio** faz `UPDATE` da mesma linha:
  - `horario_entrada = now()`
  - `etapa_terceirizado = "no_patio"` (terceirizado) ou `etapa_carga_propria = "chegou"` (própria).

### Ajustes em consultas/derivações para respeitar o novo estado

Para que o veículo **não** apareça em "Pátio Atual" / KPIs enquanto aguarda liberação:

- `PatioAtualTab.tsx` (filtro `veiculosNoPatio`): excluir entradas com `horario_entrada IS NULL` (ainda aguardando).
- `PortariaKpiCards.tsx`: mesma exclusão para "no pátio".
- `useStatusPortariaPorCarga.ts`: tratar `etapa_terceirizado === "chegada"` **ou** `horario_entrada == null` como etapa **`aguardando`** (hoje vai pra `patio`). Acrescentar nova etapa visual `"chegou"` opcional, ou manter como `aguardando` com sub-label "Chegou — aguardando liberação".
- `CargasFechadasAguardandoPanel`: além de listar cargas fechadas sem entrada, listar também cargas que têm entrada criada mas com `horario_entrada IS NULL` (estado intermediário).

## Mudanças por arquivo

### `src/hooks/useCarregamentos.ts` (hook `useCargasFechadasAguardando`)
- Atualmente filtra cargas fechadas que **não têm** movimentação de entrada. Atualizar para **também incluir** as que têm entrada com `horario_entrada IS NULL` e expor uma flag `chegouAguardandoLiberacao` + `movimentoChegadaId` + `horarioChegada` no resultado.

### `src/components/portaria/RegistroEntradaDialog.tsx`
- Renomear ação no caminho "vinculado a carga" para **registrar chegada** (não mais entrada): salvar com `horario_chegada = now()`, `horario_entrada = NULL`, `etapa_terceirizado = "chegada"` (ou `etapa_carga_propria = "aguardando_liberacao"`).
- Não atualizar `veiculos_esperados.conferido = true` ainda (deixar para o passo de liberação).
- Toast: "Chegada registrada — aguardando liberação para entrar no pátio".

### `src/components/portaria/CargasFechadasAguardandoPanel.tsx`
- Renderizar 2 estados visuais por linha:
  - **Sem chegada**: botão `Registrar chegada` (estilo atual).
  - **Com chegada aguardando liberação**: badge âmbar `Aguardando liberação · HH:mm (Xmin)`, botão primário `Liberar entrada no pátio`, botão fantasma `Desfazer chegada`.
- Novos handlers chamam:
  - `liberarEntrada(movId)` → `UPDATE movimentacoes_portaria SET horario_entrada = now(), etapa_terceirizado = 'no_patio'/etapa_carga_propria = 'chegou' WHERE id = movId`; depois `UPDATE veiculos_esperados SET conferido = true, conferido_em = now() WHERE carga_id = X`. Invalida queries (`movimentacoes_portaria`, `cargas_fechadas_aguardando`, `veiculos_esperados`, `carregamentos`).
  - `desfazerChegada(movId)` → `DELETE FROM movimentacoes_portaria WHERE id = movId AND horario_entrada IS NULL` (segurança extra: só deixa apagar enquanto ainda não foi liberada). Invalida as mesmas queries.

### `src/components/portaria/PatioAtualTab.tsx`
- Adicionar `m.horario_entrada != null` ao filtro `veiculosNoPatio` (entradas sem `horario_entrada` ainda estão "fora do portão").

### `src/components/portaria/PortariaKpiCards.tsx`
- Mesma exclusão para o card "no pátio".

### `src/hooks/useStatusPortariaPorCarga.ts`
- Em `deriveEtapa`, considerar entrada com `horario_entrada == null` (ou `etapa_terceirizado === "chegada"`) como **`aguardando`**, não `patio`. Manter `patio` apenas para entrada com `horario_entrada` preenchido.

### Memória
- Atualizar `mem://features/portaria-third-party-workflow` para refletir o fluxo em **duas etapas** (Chegada → Liberação para o pátio → Saída) e a regra "no pátio" só após liberação.

## O que **não** muda

- Nenhuma alteração de schema/migration: usamos campos já existentes (`horario_chegada`, `horario_entrada`, `etapa_terceirizado`, `etapa_carga_propria`).
- Fluxo do walk-in (motorista chega sem carga vinculada) permanece igual.
- Fluxo de saída do pátio permanece igual.
- Nenhuma alteração nos pedidos / tabela de carregamentos.

## Resumo de UX

- Chegada da carga → **status muda para "Aguardando liberação"** (não "no pátio").
- Cronômetro mostra há quanto tempo o motorista está esperando.
- Quando o porteiro libera, aí sim entra para "Pátio Atual" e KPIs.
- Possível desfazer a chegada se foi registrada por engano (somente antes da liberação).