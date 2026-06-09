## Sanfonado de clientes por produto em ruptura

Em **Rupturas → Faltando Agora**, cada linha de produto vira **expansível** (sanfonado). Ao clicar, abre abaixo a lista de clientes que estão com aquele produto em ruptura.

### Onde
- Arquivo: `src/pages/Rupturas.tsx`, componente `FaltandoAgora` (tabela desktop + cards mobile). Aba "Faltando agora" apenas. Histórico permanece como está.

### Comportamento
- Estado local `expandido: string | null` guarda a chave do produto aberto (uma de cada vez, como já existe em `HistoricoMes`).
- Click em qualquer lugar da linha do produto (ou em um chevron à esquerda do código) alterna abrir/fechar.
- Linha aberta mostra abaixo uma sub-tabela com, para cada pedido do produto em ruptura:
  - **Cliente** (`cliente`) + código (`codigo_cliente`)
  - **Cidade/UF** (`cidade`/`uf`)
  - **Pedido** (`numero_pedido`)
  - **Carga** (`nome_carga` ou "—")
  - **Faltando** — `pesoNaoCarregado(c)` em kg, ou `quantidadeNaoCarregada(c)` em UNID se `isPorUnidade`
  - **Vendedor** (`vendedor`) — discreto
- Dados vêm do array `rupturas` já filtrado (sem nova query); agrupados por `codigo_produto || nome_produto` igual ao `productSummary`.
- Linhas internas ordenadas por peso/qtd faltando desc.

### UI desktop
- Adicionar coluna "indicador" (chevron) no início. Linha do produto fica `cursor-pointer hover:bg-muted/40`.
- Quando expandido, inserir um `<TableRow>` com `<TableCell colSpan={6}>` contendo uma tabela compacta (text-xs, padding reduzido, fundo `bg-rose-50/30 dark:bg-rose-950/10`).

### UI mobile
- Card do produto ganha botão "Ver clientes (N)" no rodapé. Quando aberto, lista vertical de mini-cards com Cliente · Cidade/UF · Pedido · Carga · Faltando.

### Fora de escopo
- Histórico do mês, exports, KPIs, hooks de dados. Sem mudança de schema ou query.
