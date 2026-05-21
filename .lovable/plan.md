## O que encontrei

A pré-carga **JORGE BATISTA** (`PRE-20260520-112246-8CP`, vendedor DICKSON) tinha apenas os pedidos **103** e **104**. Por volta de **11:54 (BRT)** de hoje você adicionou mais 6 pedidos a essa pré-carga via "Add Carga" — **antes** da correção que acabamos de aplicar. Por causa do bug antigo, esses pedidos foram gravados com `etapa = 'logistica'` e `nome_carga` vazio, em vez de `etapa = 'pre_carga'`. Por isso eles sumiram do painel de Pré-cargas.

Pedidos afetados (todos com `carga_id = PRE-20260520-112246-8CP`, vendedor DICKSON):

| Pedido | Cliente |
|---|---|
| 150 | MIX MATEUS 271 MIX FLORIANO PI |
| 151 | HIPER MATEUS |
| 152 | MIX MATEUS 251 MIX PARNAIBA |
| 153 | MIX MATEUS 97 MIX TERESINA |
| 154 | MIX MATEUS 252 MIX TERESINA NOVAFAPI |
| 155 | MIX MATEUS 211 SUPER PIRIPIRI |

## Correção proposta

Rodar um UPDATE direto em `carregamentos_dia` nas linhas com:

- `carga_id = 'PRE-20260520-112246-8CP'`
- `etapa = 'logistica'`

setando:

- `etapa = 'pre_carga'`
- `nome_carga = 'JORGE BATISTA'`
- `updated_at = now()`

Não vou mexer em `data` (cada pedido mantém a sua data original — 2026-05-21), nem em placa/motorista/transportadora/ordem_carga (a pré-carga não tem esses campos preenchidos ainda).

Depois disso, os 6 pedidos voltam a aparecer dentro da pré-carga JORGE BATISTA no painel principal.
