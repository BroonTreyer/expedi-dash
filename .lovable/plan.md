

# Registrar Horários das 3 Etapas + Renomear "Retorno" para "Saída"

## Problema

1. Os horários das 3 etapas de terceirizados (chegada, entrada liberada, saída) não são exibidos de forma clara no pátio
2. O termo "Retorno" é usado em todo o sistema mas deveria ser "Saída"

## Solução

### Parte 1 — Renomear "Retorno" para "Saída" em toda a interface

Arquivos afetados e todas as ocorrências:

- **`PatioAtualTab.tsx`**: "Retorno c/ KM" → "Saída c/ KM", "Confirmar Retorno" → "Confirmar Saída", "Retorno" → "Saída" (botões nas linhas 269, 283, 288, 357, 377)
- **`HistoricoTab.tsx`**: "Retorno" → "Saída" nos badges (linhas 216, 289)
- **`PortariaKpiCards.tsx`**: "Retornos" → "Saídas" no label do card (linha 40)
- **`Portaria.tsx`**: "Retorno" → "Saída" no filtro select e no CSV export (linhas 166, 332)
- **`EditMovimentoDialog.tsx`**: "Retorno" → "Saída" no select option (linha 142)
- **`MovimentoDetailsDialog.tsx`**: "Retorno" → "Saída" nos labels de fotos e badge (linhas 121-124, 151)

### Parte 2 — Exibir horários das 3 etapas no pátio

No `PatioAtualTab.tsx`, para terceirizados exibir os horários registrados:

- **Chegada**: `horario_chegada` (já registrado na criação)
- **Entrada Liberada**: `horario_entrada` (registrado ao clicar "Liberar Entrada")
- **Saída**: mostrado quando finalizado (via registro de saída vinculado)

Adicionar na grid de detalhes do card mobile e na tabela desktop uma sub-linha com os horários:
```
Chegada: 08:30 | Entrada: 09:15 | Saída: —
```

Isso será exibido apenas para `categoria === "terceirizado"` como informação extra abaixo dos dados existentes.

### Parte 3 — Registrar `horario_real_saida` no registro de saída do terceirizado

Na `handleSaidaRapida`, ao marcar como "finalizado", também salvar `horario_real_saida` na entrada para ter o horário completo no mesmo registro.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/PatioAtualTab.tsx` | Renomear "Retorno" → "Saída", exibir horários das 3 etapas para terceirizados |
| `src/components/portaria/HistoricoTab.tsx` | Renomear "Retorno" → "Saída" |
| `src/components/portaria/PortariaKpiCards.tsx` | Renomear "Retornos" → "Saídas" |
| `src/pages/Portaria.tsx` | Renomear "Retorno" → "Saída" no filtro e export |
| `src/components/portaria/EditMovimentoDialog.tsx` | Renomear "Retorno" → "Saída" |
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Renomear "Retorno" → "Saída" |

