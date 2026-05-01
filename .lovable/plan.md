## Diagnóstico (confirmado)

A planilha **foi importada corretamente**. Estão no banco, todos como `grupo='PRÓPRIA'`:

- 02/05/2026 → 2 veículos
- 04/05/2026 → 28 veículos

Então por que você não vê em **Portaria → Carga Própria → Esperados**? Por causa da **janela fixa de ±3 dias** do hook `useVeiculosEsperados`:

- Hoje é 30/04. A página inicia com data = hoje.
- O hook (`src/hooks/useVeiculosEsperados.ts`) calcula `dataInicio = data - 3` e `dataLimite = data + 3` → janela 27/04 até 03/05.
- Os 2 do dia 02/05 caem dentro (devem aparecer).
- **Os 28 do dia 04/05 ficam fora** — 1 dia além da janela. Por isso "não aparece nada".

Além disso, a página `Portaria.tsx` (linha 78) só passa `dateFromStr` ao hook, ignorando o `dateTo` do seletor de intervalo. Mesmo se você escolher "30/04 → 04/05" no calendário da Portaria, a janela continua ancorada só no `from`.

## Correção

### 1. Respeitar o intervalo selecionado
Em `src/hooks/useVeiculosEsperados.ts`, alterar `useVeiculosEsperados(dataReferencia: string)` para `useVeiculosEsperados(dataInicio: string, dataFim?: string)`:
- Se `dataFim` vier, usar `[dataInicio .. dataFim]` exatamente.
- Se não vier, manter o comportamento atual (±3 dias) para não quebrar outras telas.

Em `src/pages/Portaria.tsx` (linha 78) passar os dois: `useVeiculosEsperados(dateFromStr, dateToStr)`.

Com isso, basta o usuário escolher "30/04 → 04/05" para ver os 30 veículos.

### 2. Auto-ajustar o range após import
No `handleImportConfirm` em `Portaria.tsx`, depois de importar com sucesso:
- Calcular min/max das datas dos `rows` importados.
- Se algum estiver fora do `dateRange` atual, expandir o `dateRange` para englobar todas.
- Toast informando: `"30 veículos importados — datas 02/05 a 04/05. Intervalo da tela ajustado."`

Assim o usuário **vê imediatamente** o que acabou de importar, sem precisar mexer no calendário.

### 3. Mensagem clara quando há registros fora da janela
Ainda no `Portaria.tsx`, adicionar um aviso pequeno acima da lista de Esperados quando houver registros importados em datas fora do intervalo atual: `"Há N veículos esperados em outras datas (ex.: 04/05). Amplie o intervalo para visualizá-los."` — com botão "Mostrar tudo" que expande pra abranger min/max.

## O que NÃO mudar

- O parser do Excel (já leu e gravou corretamente para esta planilha).
- O grupo padrão `PRÓPRIA` (correto para esta planilha).
- A semântica do hook nas demais páginas que ainda chamam com 1 argumento (compatibilidade preservada via parâmetro opcional).

## Resultado esperado

1. Selecionando data "Hoje" + janela ampliada após import → você vê os 30 veículos imediatamente.
2. Escolhendo manualmente intervalo 30/04 → 04/05 no calendário → você vê os 30.
3. Próximas importações ajustam a tela automaticamente para abranger as datas trazidas.

Posso aplicar?
