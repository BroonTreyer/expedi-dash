## Objetivo

Simplificar a página **Rupturas** para que o foco principal seja "qual produto está faltando", removendo o excesso de abas, KPIs e colunas que dificultam a leitura.

## O que muda

### Remover (excesso de informação)

- **Abas:** Lista detalhada, Visão geral, Por cliente, Por carga, Linha do tempo, Itens — todas removidas. Não haverá mais sistema de abas.
- **KPIs do topo:** dos 6 cards atuais (Itens, Peso, Cargas, Clientes, Pedidos editados, Maior corte) ficam apenas **2**: Itens em ruptura e Peso/unidades não carregados.
- **Filtros pouco usados:** Vendedor, Cliente, e o seletor "Totais/Parciais/Ambas" — removidos. Continua só **período (data)**, **carga** e **busca**.
- **CSV/Imprimir:** mantidos, mas exportam apenas a visão de produto.

### Nova estrutura (uma tela só)

```text
┌──────────────────────────────────────────────────────────┐
│ Rupturas                            [Exportar] [Imprimir]│
│ Período: [01/04 – 29/04]  Carga: [Todas ▾]  [Buscar...]  │
├──────────────────────────────────────────────────────────┤
│ ⚠ 12 itens em ruptura      📦 850 kg / 320 UNID em falta │
├──────────────────────────────────────────────────────────┤
│  PRODUTO                       FALTANDO   PEDIDOS  ▾     │
│ ─────────────────────────────────────────────────────── │
│  ▸ COXÃO MOLE PEÇA              420 kg     5 pedidos    │
│       3 clientes · Cargas: CARGA 12, CARGA 15           │
│  ▸ PÃO DE ALHO                  120 UNID   4 pedidos    │
│       4 clientes · Cargas: CARGA 12                     │
│  ▸ PICANHA FATIADA              310 kg     3 pedidos    │
│       2 clientes · Cargas: CARGA 09, CARGA 12, CARGA 14 │
└──────────────────────────────────────────────────────────┘
```

Cada linha:
- **Nome do produto** (grande, em destaque). Código pequeno embaixo.
- **Quantidade faltando** com unidade correta (`kg` ou `UNID` para pão de alho e similares — usa o helper `isPorUnidade` já existente).
- **Pedidos afetados** (contagem).
- **Linha secundária** menor com: nº de clientes afetados + lista resumida das cargas onde aparece (até 3 nomes; "+N" se mais).
- **Mobile**: cada produto vira um card empilhado com as mesmas três informações (faltando / pedidos / clientes+cargas).

Ordenação padrão: maior quantidade faltando primeiro.

### O que continua funcionando por baixo

- O hook `useCarregamentos`, a detecção de ruptura (`isRupturaParcial` + `pesoNaoCarregado`) e o agregado `productSummary` já existem — vou reaproveitar.
- O deep-link `?carga=NomeCarga` continua filtrando pela carga.
- Permissões e botão "Novo Pedido (Ruptura)" mantidos para quem pode editar.
- Diálogo de impressão (`RupturasPrintDialog`) recebe os mesmos dados de produto que já recebia.

## Arquivos a editar

- `src/pages/Rupturas.tsx` — reescrita da UI: remoção das abas, dos KPIs extras, dos filtros vendedor/cliente/tipo, da timeline e da lista detalhada. Nova tabela/cards focados em produto.
- (sem mudanças em hooks ou no banco)

## Resultado

Tela limpa, uma única lista, leitura imediata: "este produto, esta quantidade faltando, em tantos pedidos, afetando tantos clientes em tais cargas".