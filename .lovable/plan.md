

## Bug: Detalhes de Carga Própria mostram informações duplicadas / faltando

### Causa raiz
Na **Carga Própria** o fluxo de 3 etapas (Saída p/ Rota → Retorno → Lacre) grava **tudo num único registro** (`tipo_movimento = "saida"` que é atualizado em cada etapa). Mas o `HistoricoTab` agrupa esse registro como "standalone saída" e o `Portaria.openDetails` passa o mesmo objeto como `movimento` E `movimentoSaida`. Resultado no `MovimentoDetailsDialog`:

- **Fotos duplicadas**: cada foto aparece 2x — uma rotulada `(Entrada)` e outra `(Saída)` (lacre, painel, placa, etc).
- **Conferente/Observações duplicados**: mesmo texto repetido em "Entrada" e "Saída".
- **Bloco de horários incompleto**: a lógica do else só mostra "Saída" e exige `m.tipo_movimento === "entrada"` para mostrar "Tempo Gasto". Para Carga Própria, os horários `horario_real_saida` e `horario_real_retorno` são ignorados.
- **Bug de sobrescrita**: em `RegistroMovimentoDialog.tsx` (linha 245), a etapa "lacre" grava `horario_real_saida = now()`, **sobrescrevendo** o horário da saída p/ rota original. Não há campo separado para "saída final c/ lacre".

### Correção

#### 1. `src/components/portaria/MovimentoDetailsDialog.tsx`

**Detectar Carga Própria e não duplicar**:
- Adicionar `const isCargaPropria = m.categoria === "carga_propria";`
- Adicionar `const isSameRecord = s && s.id === m.id;` para detectar quando `s` é o mesmo objeto que `m` (caso Carga Própria).

**Bloco de Fotos** (linhas 127-139): quando `isCargaPropria` (registro único), montar `allPhotos` apenas a partir de `m`, com **labels por etapa** ao invés de "(Entrada)/(Saída)":
- `foto_placa_url` → "📷 Foto da Placa"
- `foto_painel_url` → "🛞 Painel KM (Retorno)"
- `foto_lacre_url` → "🔒 Foto do Lacre (Saída Final)"
- `foto_documento_url` → "📄 Documento"
- `foto_nota_url` → "📋 Nota Fiscal"

Para outras categorias, manter lógica atual mas adicionar guard `if (!isSameRecord)` antes de incluir fotos de `s` (evita duplicação acidental).

**Bloco de Horários** (linhas 184-263): adicionar branch dedicado para Carga Própria mostrando:
- 🟠 Chegada (`m.horario_chegada || m.data_hora`)
- 🔵 Saída p/ Rota (`m.horario_real_saida` quando etapa ≥ em_rota)
- 🟡 Retorno (`m.horario_real_retorno` quando etapa ≥ retornou)
- 🔒 Saída Final c/ Lacre (`m.horario_saida_final` — novo campo, ver item 3)
- ⏱ Tempo total em rota (Retorno − Saída p/ Rota), Tempo total no pátio (Saída Final − Retorno)

**Conferente / Observações / Lacre** (linhas 327-328, 387-388, 405-421): quando `isSameRecord`, mostrar apenas a versão de `m` sem labels duplicados "(Entrada)/(Saída)".

#### 2. `src/components/portaria/HistoricoTab.tsx`

Em `openDetails` (chamada via `onViewDetails(g.entrada, g.saida)` linhas 201, 305): nada a alterar aqui — a correção do dialog já trata o caso de `m === s`.

#### 3. `src/components/portaria/RegistroMovimentoDialog.tsx`

Corrigir o bug de sobrescrita do horário da saída inicial:
- **Linha 245**: trocar `updates.horario_real_saida = ...` por `updates.horario_saida_final = ...` (novo campo) para que o horário da saída p/ rota original (gravado na etapa em_rota) seja preservado.

#### 4. Migration de banco

Adicionar coluna `horario_saida_final timestamp with time zone null` em `movimentacoes_portaria` para registrar o horário da saída final c/ lacre da Carga Própria sem sobrescrever `horario_real_saida` (saída p/ rota).

### Resultado esperado

Ao abrir Detalhes de um registro de Carga Própria:
- Fotos da placa, painel KM e **lacre** aparecem **uma única vez** com labels claros por etapa.
- Bloco de horários mostra a linha do tempo completa: Chegada → Saída p/ Rota → Retorno → Saída Final.
- Conferente, observações e número do lacre não duplicam.

### Arquivos
- ✏️ `src/components/portaria/MovimentoDetailsDialog.tsx` — branch Carga Própria, deduplicação, novo bloco de horários
- ✏️ `src/components/portaria/RegistroMovimentoDialog.tsx` — usar `horario_saida_final` na etapa lacre
- 🆕 Migration — coluna `horario_saida_final` em `movimentacoes_portaria`

