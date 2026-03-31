

# Exibir Horário de Chegada no Pátio e Detalhes (Terceirizados)

## Problema

O código para exibir os 3 horários no `PatioAtualTab` já existe, mas o `MovimentoDetailsDialog` (tela de detalhes) não mostra os horários específicos de terceirizados (`horario_chegada`, `horario_entrada`, `horario_real_saida`). Além disso, registros antigos podem não ter `horario_chegada` preenchido.

## Correções

### 1. `MovimentoDetailsDialog.tsx` — Seção de horários para terceirizados

Na seção "Horários" (linhas 166-202), quando `m.categoria === "terceirizado"`, substituir a exibição genérica por 3 linhas específicas:

- **🟡 Chegada:** `m.horario_chegada` ou `m.data_hora` como fallback
- **🟢 Entrada Liberada:** `m.horario_entrada` ou "—"
- **📤 Saída:** `m.horario_real_saida` ou `s.data_hora` ou "—"
- **⏱ Tempo de Espera:** diferença entre chegada e entrada liberada
- **⏱ Tempo Total:** diferença entre chegada e saída

### 2. `PatioAtualTab.tsx` — Fallback para `horario_chegada`

Usar `m.data_hora` como fallback quando `horario_chegada` não estiver preenchido (registros antigos), para que sempre mostre algo na linha "Chegada".

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/MovimentoDetailsDialog.tsx` | Exibir 3 horários distintos para terceirizados com cálculos de tempo |
| `src/components/portaria/PatioAtualTab.tsx` | Usar `data_hora` como fallback para `horario_chegada` |

