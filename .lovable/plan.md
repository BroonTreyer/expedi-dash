# Reagrupar CT-es por OC em "Aguardando Quitação"

## Problema
No card de uma transportadora dentro da aba **Aguardando Quitação** (Logística → Adiantamentos), cada adiantamento aparece como uma linha separada com "1 CT-e", mesmo quando vários ADTs pertencem à mesma OC. Antes, esses CT-es da mesma OC eram consolidados em uma única linha (ex.: "OC 130753 · 8 CT-e · R$ ...").

A lógica de consolidação (`consolidarPorOC`) já existe no arquivo e é usada nas abas Pendentes/Quitados, mas o bloco interno do card de transportadora em "Aguardando Quitação" (`src/components/logistica/AdiantamentosTab.tsx`, ~linhas 852-869) renderiza `lista.map((a) => ...)` direto sobre os ADTs individuais.

## Mudança
Em `src/components/logistica/AdiantamentosTab.tsx`, dentro do card de cada transportadora pagos (bloco que hoje faz `lista.map((a) => <label>...</label>)`):

1. Aplicar `consolidarPorOC(lista)` para obter grupos por OC.
2. Renderizar **uma linha por grupo** com:
   - Número representativo do ADT (sem o sufixo `-OC...`), ou contagem "N ADTs" quando houver mais de um.
   - `OC {ordem_carga}` (ou "Lote" quando `tipo_agrupamento !== "ordem"`).
   - `{qtdCtes} CT-e` (somatório do grupo).
   - Valor = `valorSaldo` do grupo (soma dos saldos dos ADTs).
3. Checkbox da linha:
   - `checked` quando **todos** os `items` do grupo estão em `selPagos`.
   - `onCheckedChange`: adiciona/remove todos os `item.id` do grupo em `selPagos` de uma vez.
4. Manter o cabeçalho do card (contagem total de lotes, saldo total, botões "Ver comprovantes" / "Registrar Quitação") inalterado — só o detalhamento interno muda.

Sem alterações em hooks, schema ou outras abas.
