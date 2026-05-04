## Problema

Após a correção anterior (marcar `conferido = true` quando o porteiro registra a chegada), o veículo:
- ✅ Sai da lista de **Esperados** (correto)
- ❌ Não aparece no **Pátio** (cartão azul "Aguardando liberação")
- ❌ Vai direto para o **Histórico** — efeito colateral inesperado

## Causa

Conflito entre dois filtros que assumiam significados diferentes para o flag `veiculos_esperados.conferido`:

1. **`useCargasFechadasAguardando`** (`src/hooks/useCarregamentos.ts`, linha 501-505): remove a carga do painel azul "Cargas Fechadas Aguardando" se existir um `veiculo_esperado` com aquela `carga_id` e `conferido = true`. O comentário diz explicitamente: *"motorista entrou no pátio"*.

2. **`PatioAtualTab`** (linhas 121-124): exclui movimentações em `etapa_terceirizado = "chegada"` ou `etapa_carga_propria = "aguardando_liberacao"` enquanto `horario_entrada` for `null` — pois ainda não estão fisicamente no pátio.

Antes da correção, "conferido" significava "entrou no pátio". Agora significa apenas "chegada registrada na portaria". A movimentação fica em fase intermediária (chegada/aguardando_liberacao, sem `horario_entrada`), que **nenhum painel** mostra. O único lugar que mostra é o **Histórico**, que lista tudo.

## Correção

**Arquivo único: `src/hooks/useCarregamentos.ts`** — ajustar `cargasComPrevistoConferido` para refletir o novo significado de "conferido":

1. Trazer também `horario_entrada` (na verdade já é difícil — precisamos cruzar com movimentação). Solução mais simples: **manter a carga no painel azul "Aguardando liberação" enquanto `horario_entrada` da movimentação for `null`**.

2. Mudar a linha 561 de:
   ```ts
   if (cargasComPrevistoConferido.has(c.carga_id)) continue;
   ```
   para:
   ```ts
   // Só some do painel quando o veículo realmente entrou no pátio
   // (existe entrada com horario_entrada preenchido).
   if (entrada && entrada.horario_entrada) continue;          // já tratado abaixo
   if (cargasComPrevistoConferido.has(c.carga_id) && entrada?.horario_entrada) continue;
   ```
   Na prática, basta **remover a verificação de `cargasComPrevistoConferido.has(...)`** porque a linha 564 (`if (entrada && entrada.horario_entrada) continue;`) já cobre o caso "motorista entrou no pátio" via movimentação.

3. Como `cargasComPrevistoConferido` ficaria sem uso, remover também o bloco de query de `previstos` (linhas 492-505) para evitar query desnecessária.

## Resultado esperado

Após clicar em **Registrar Chegada** num veículo da lista Esperados:
- Some imediatamente da lista de Esperados ✅
- Aparece no painel **azul "Cargas Fechadas Aguardando Veículo"** com badge laranja "Aguardando liberação" e botão **"Liberar entrada no pátio"** ✅
- Ao liberar, vai para a aba **Pátio** (cartão verde) ✅
- Continua aparecendo no **Histórico** como movimentação registrada ✅

## Impacto

- Arquivo único, sem migração de banco, sem mudança de RLS.
- Remove uma query (`veiculos_esperados`) — ligeira melhora de performance.
- Não afeta walk-ins (já tratados por `chegouAguardandoLiberacao` e fluxo `useRegistrarChegadaPortaria`).
- Não afeta o card azul para cargas que ainda não tiveram chegada registrada.
