# Onda 5 — Fila "Aguardando Vínculo Logístico" para Terceirizados

## Problema

Em `/portaria/terceirizado`, motoristas terceirizados que registraram chegada **sem carga vinculada** (`carga_id IS NULL`, `etapa_terceirizado='chegada'`) aparecem na aba "Pátio" com badge "Aguardando Liberação" e botão "Liberar Entrada". Isso está errado: a Portaria **não pode liberar** um terceirizado enquanto a Logística não vincular uma carga (transportadora + pedidos) ao motorista. O botão atual permite que a Portaria pule a etapa, sujando os dados.

Confirmado no banco: 4 dos 5 cartões na captura têm `carga_id = NULL` e estão como `etapa_terceirizado='chegada'`. Apenas o cartão "No Pátio" (PBV1F92) já está corretamente vinculado a `ELIAS ROTA`.

## Solução

Separar visualmente dois estados que hoje estão misturados na aba Pátio:

1. **Aguardando Vínculo Logístico** (novo) — terceirizado chegou mas sem `carga_id`. Cartão somente leitura para a Portaria; **só Logística/Admin** podem agir (vincular carga ou cancelar chegada).
2. **Pátio Atual** — apenas terceirizados com carga já vinculada (com botão "Liberar Entrada" quando aplicável, e demais ações do ciclo).

## Mudanças de UI

### A. Novo painel "Aguardando Vínculo Logístico" (acima da aba Pátio)
- Componente `AguardandoVinculoLogisticoPanel.tsx`, estilo do `CargasFechadasAguardandoPanel` (header laranja com contagem e ícone de ampulheta).
- Lista cada movimentação `categoria='terceirizado'` com `etapa_terceirizado='chegada'`, `horario_entrada IS NULL`, `carga_id IS NULL`, não finalizada.
- Cada cartão exibe: placa, motorista, transportadora declarada na chegada (se houver), tempo desde chegada, e os botões:
  - **"Vincular Carga"** (Logística/Admin) → abre seletor das cargas terceirizadas fechadas disponíveis para vínculo (lista de `carregamentos_dia` com `etapa='logistica'`, `transportadora` preenchida, e sem placa/motorista atribuídos OU com placa que casa). Ao confirmar: `UPDATE movimentacoes_portaria SET carga_id=...` + sincronizar `veiculos_esperados` (mesma lógica do trigger `vincular_veiculo_esperado_tardio`).
  - **"Cancelar Chegada"** (Logística/Admin) → mesma confirmação destrutiva já existente; marca `etapa_terceirizado='finalizado'` com observação "Chegada cancelada — sem vínculo".
- Para a **Portaria** (role `portaria`): cartão visível em modo informativo, com badge "Aguardando Logística" e mensagem "Aguardando vínculo de carga pela Logística" — sem botões de ação.

### B. Aba "Pátio" filtra fora os sem-vínculo
- Em `PatioAtualTab.tsx`, no `useMemo veiculosNoPatio`, adicionar:
  ```ts
  // Terceirizado sem carga vinculada não pertence ao Pátio —
  // pertence à fila "Aguardando Vínculo Logístico" (painel acima).
  if (m.categoria === "terceirizado"
      && m.etapa_terceirizado === "chegada"
      && !m.carga_id) return false;
  ```
- Atualizar `counts.patio` em `Portaria.tsx` para refletir o mesmo filtro (manter consistência com o badge da aba).

### C. KPI e contagem
- O badge "Pátio" da aba terceirizado deixa de incluir os 4 sem-vínculo. Novo indicador no header do painel novo: "N aguardando vínculo".

## Mudanças no banco

Nenhum schema novo. Reaproveitamos:
- `movimentacoes_portaria` (estado já existente: `etapa_terceirizado='chegada'` + `carga_id IS NULL`).
- `carregamentos_dia` para listar cargas terceirizadas fechadas disponíveis no seletor.
- `veiculos_esperados` para sincronizar o vínculo (lógica equivalente ao trigger atual).

## Permissões

| Ação | Portaria | Logística | Admin |
|---|---|---|---|
| Ver fila "Aguardando Vínculo" | ✅ leitura | ✅ | ✅ |
| Vincular carga | ❌ | ✅ | ✅ |
| Cancelar chegada sem vínculo | ❌ | ✅ | ✅ |
| Liberar Entrada (após vínculo) | ✅ | ✅ | ✅ |

## Arquivos afetados

- **novo:** `src/components/portaria/AguardandoVinculoLogisticoPanel.tsx`
- **novo:** `src/components/portaria/VincularCargaDialog.tsx` (seletor de carga fechada terceirizada)
- **edit:** `src/pages/Portaria.tsx` — montar o novo painel acima das tabs (somente quando `categoria==='terceirizado'`); ajustar `counts.patio`.
- **edit:** `src/components/portaria/PatioAtualTab.tsx` — filtro extra no `veiculosNoPatio`.
- **edit (opcional):** `src/components/portaria/PortariaKpiCards.tsx` — KPI "Aguardando Vínculo".

## Validação

1. `/portaria/terceirizado` — os 4 cartões sem carga (PBV1F92 20:12, JKL9723, RMB0C89, TWD5I87) saem do Pátio e aparecem no novo painel laranja "Aguardando Vínculo Logístico".
2. PBV1F92 15:33 (já vinculado a `ELIAS ROTA`) **continua** no Pátio com badge "No Pátio" e botão "Registrar Saída".
3. Logado como Portaria: nos cartões do novo painel não aparecem botões de ação, só a mensagem informativa.
4. Logado como Logística: clicar "Vincular Carga" → seleciona uma carga fechada terceirizada → cartão sai da fila e entra no Pátio com botão "Liberar Entrada".
5. Badge da aba "Pátio" cai de 5 → 1.
