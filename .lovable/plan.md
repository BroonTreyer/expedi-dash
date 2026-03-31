

# Regra de Data Prevista nos Veículos Esperados

## Resumo

Tudo permanece liberado (entrada e conferido), mas quando o conferente tenta dar baixa **antes** da data prevista (`data_referencia`), o sistema mostra um **aviso visual** (badge amarelo) no card/linha do veículo e exibe um **toast de alerta** ao confirmar, sem bloquear a ação.

## Mudanças

### 1. `VeiculosEsperadosPanel.tsx`

- Receber a data atual filtrada como prop
- Comparar `v.data_referencia` com a data atual
- Se `data_referencia > hoje`: mostrar badge amarelo "Saída prevista DD/MM" no card e na linha da tabela
- O botão "Registrar Entrada" continua habilitado, mas ao clicar em veículo cuja data ainda não chegou, passa flag `antecipado` para o callback

### 2. `Portaria.tsx`

- Na função `openRegistroFromVeiculoEsperado`, verificar se a data de referência do veículo é futura
- Se for, exibir `toast.warning("Atenção: este veículo tem saída prevista para DD/MM")` antes de abrir o dialog
- Na query `useVeiculosEsperados`, buscar veículos de **hoje e datas futuras** (não só `eq`, usar `gte`) para que veículos do dia 30 apareçam quando o filtro está no dia 29

### 3. `useVeiculosEsperados.ts`

- Alterar a query para usar `.gte("data_referencia", dataReferencia)` em vez de `.eq(...)` — assim veículos de datas futuras próximas aparecem na lista
- Adicionar filtro de limite (ex: próximos 3 dias) para não trazer tudo: `.lte("data_referencia", dataReferencia + 3 dias)`

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useVeiculosEsperados.ts` | Query com `gte` + `lte` (janela de 3 dias) |
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Badge "Saída prevista DD/MM" para veículos com data futura |
| `src/pages/Portaria.tsx` | Toast de aviso ao registrar veículo antecipado |

