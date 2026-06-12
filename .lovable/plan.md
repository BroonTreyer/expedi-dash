## Problema

O aumento de fonte aplicado na Portaria (text-xs 12px → 14px = +16%) estourou caixas de largura fixa — o badge "Aguardando liberação", chips, e blocos do painel "Cargas fechadas aguardando veículo" quebram, sobrepõem e estouram colunas tanto em desktop quanto em mobile.

## Solução

Reduzir o degrau do aumento em `src/index.css` (regras escopadas por `[data-portaria="true"]`) para um bump **mais suave de +1px** em cada tamanho, mantendo a melhora de leitura sem estourar layouts.

### Alteração única em `src/index.css`

| Classe | Hoje | Novo |
|---|---|---|
| `text-[10px]` | 12px | **11px** |
| `text-[11px]` | 13px | **12px** |
| `text-xs` (12px nativo) | 14px | **13px** |

Line-heights ajustados proporcionalmente (0.95rem / 1rem / 1.1rem).

## Por que resolve

- +1px é o suficiente para legibilidade no pátio sem empurrar texto pra fora de badges/chips dimensionados para o tamanho original.
- Mantém o escopo `[data-portaria="true"]` já aplicado nas 4 páginas, sem mexer em componentes.
- Reversível e pontual — só edita o bloco CSS de Portaria.

## Arquivos alterados

- `src/index.css` (apenas as 3 regras escopadas)

Nenhum componente React precisa ser tocado.
