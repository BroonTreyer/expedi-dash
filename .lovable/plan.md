

## Problema

O calendário do date picker usa `bg-primary` (vermelho #D42027) para dias selecionados e `bg-accent` (verde #4CAF50) para "hoje" e range. Resultado: vermelho e verde lado a lado — visual agressivo.

## Solução

Trocar as classes do `calendar.tsx` para usar cores neutras/slate, sem alterar as variáveis CSS globais (que são usadas em outros lugares).

| Classe | Antes | Depois |
|---|---|---|
| `cell` (range bg) | `bg-accent/50`, `bg-accent` | `bg-slate-100` |
| `day_selected` | `bg-primary` (vermelho) | `bg-slate-800 text-white` |
| `day_today` | `bg-accent` (verde) | `bg-slate-200 text-slate-900` |
| `day_outside` (selected) | `bg-accent/50` | `bg-slate-100/50` |
| `day_range_middle` | `bg-accent` | `bg-slate-100 text-slate-900` |

### Arquivo a editar

| Arquivo | Mudança |
|---|---|
| `src/components/ui/calendar.tsx` | Substituir todas as referências a `bg-primary`/`bg-accent` nas classes do calendário por tons de slate neutros |

Resultado: calendário limpo, profissional, sem vermelho/verde.

