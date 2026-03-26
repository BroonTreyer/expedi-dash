

## Problema

Quando "hoje" (dia 26) faz parte do range selecionado, a classe `day_today` (`bg-slate-200 text-slate-900`) compete com `day_selected` (`bg-slate-800 text-white`), resultando em texto apagado/acinzentado.

## Correção

| Arquivo | Mudança |
|---|---|
| `src/components/ui/calendar.tsx` | Na classe `day_today` (linha 36), adicionar `aria-selected:bg-slate-800 aria-selected:text-white` para que, quando o dia de hoje estiver selecionado, mantenha o visual escuro com texto branco igual aos outros dias |

Linha 36 de:
```
"bg-slate-200 text-slate-900"
```
Para:
```
"bg-slate-200 text-slate-900 aria-selected:bg-slate-800 aria-selected:text-white"
```

