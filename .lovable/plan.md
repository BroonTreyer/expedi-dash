

## Importar pedido por PDF do Sankhya

### O problema

O Faturamento digita cada pedido duas vezes: no Sankhya e aqui. O PDF "PEDIDO DE VENDA" (NOTA_VENDA_xxxxx.pdf) já traz tudo: cliente, vendedor, número do pedido (Nr.Único / Nota Nro) e a tabela de itens com código, descrição, quantidade. Vamos extrair esses dados, deixar o usuário revisar/marcar rupturas e gravar **um `carregamentos_dia` por item** em uma única transação.

### Como vai funcionar (UX)

1. No Dashboard, ao lado de **"Adicionar Pedido"**, novo botão **"Importar PDF"**.
2. Abre dialog **`ImportarPedidoPdfDialog`**:
   - **Etapa 1 — Upload**: drop/seleção de 1 ou mais PDFs (multi-file). Para cada arquivo, mostra spinner "Lendo PDF…".
   - **Etapa 2 — Revisão**: um card por pedido lido com:
     - Cabeçalho: Nr.Único, Nota, Emissão, Cliente (cód + nome + cidade/UF), Vendedor (cód + nome), badges de avisos (cliente não cadastrado, vendedor não cadastrado, produto não cadastrado).
     - Tabela editável de itens: `Cód`, `Produto`, `Qtd`, `Peso (kg)` (auto a partir do peso padrão × qtd, exceto fatiados/unidade), `Ruptura` (checkbox), `Motivo` (input que aparece só quando ruptura marcada).
     - Botão "Remover item" e "Remover pedido" da fila.
   - Rodapé: **"Salvar N pedidos (X itens)"**.
3. Ao confirmar: insere todos os itens em batch (`carregamentos_dia`), `etapa = "vendas"`, `data = data selecionada no Dashboard`, `numero_pedido` = o número da nota do PDF (cai no `next_numero_pedido` se vier vazio), `peso_manual = true` quando o usuário editou o peso. Toast com resumo + invalida queries.

### Como o PDF é lido

Edge function nova **`parse-pedido-pdf`** (`verify_jwt = false` no config + validação JWT em código, padrão do projeto):

- Recebe `{ fileBase64, fileName }`.
- Usa **Lovable AI** (`google/gemini-2.5-flash`) com input multimodal (PDF como `image_url` data URL ou texto extraído) e **tool calling** com schema fixo:
  ```json
  {
    "numero_pedido": "128239",
    "nr_unico": "4235440",
    "emissao": "2026-04-23T10:12:16",
    "cliente": { "codigo": "794", "nome": "ILDETE ALVES GUIMARAES", "cidade": "GOIANIA", "uf": "GO" },
    "vendedor": { "codigo": "15", "nome": "ALCIR" },
    "itens": [
      { "codigo_produto": "730", "nome_produto": "CALABRESA A GRANEL PCT 2,5 KGS", "quantidade": 40, "unidade": "KG" },
      ...
    ]
  }
  ```
- Frontend faz o cruzamento com tabelas locais (`produtos`, `clientes`, `vendedores`) para preencher `peso_padrao`, `peso`, `vendedor_id`, `cidade/uf` (se cliente já cadastrado). Itens sem match ficam com badge âmbar "Cadastrar manualmente" mas continuam editáveis e salvam mesmo assim — `carregamentos_dia` não tem FK para produto/cliente (já documentado em memória).

### Detalhes técnicos

- **Arquivos novos**:
  - `supabase/functions/parse-pedido-pdf/index.ts` — recebe PDF base64, chama Lovable AI Gateway com tool `extract_pedido`, retorna JSON estruturado. Valida JWT via `auth.getUser()`, CORS padrão do projeto.
  - `src/components/dashboard/ImportarPedidoPdfDialog.tsx` — dialog 2 etapas (Upload → Revisão), tabela editável reaproveitando padrão de `CarregamentoDialog`.
  - `src/hooks/useImportarPedidoPdf.ts` — `useMutation` que faz `supabase.functions.invoke("parse-pedido-pdf", ...)` por arquivo (em paralelo com `Promise.allSettled`).
- **Arquivos editados**:
  - `src/pages/Index.tsx` — botão "Importar PDF" no header + estado do dialog + handler de inserção em batch (mesma lógica do `handleSubmit` vendas multi-item já existente).
  - `supabase/config.toml` — adicionar `[functions.parse-pedido-pdf] verify_jwt = false`.
- **Banco**: nenhuma migração. Usa `carregamentos_dia` como já é hoje. RLS de insert para `admin/faturamento/logistica` já permite.
- **Multi-PDF**: aceita vários PDFs de uma vez (faturamento normalmente baixa em lote). Falhas individuais não bloqueiam o lote.
- **Idempotência leve**: se já existir item com mesma `data + numero_pedido + codigo_produto`, mostra alerta no card "Pedido já importado" e desmarca por padrão (usuário pode forçar).
- **Peso**: regra atual (qtd × peso_padrao, exceto produtos por unidade como Pão de Alho — usa `isPorUnidade`). Quando o usuário edita manualmente, `peso_manual = true`.

### Limitações assumidas

- Layout do PDF é o do Sankhya mostrado (campos: Cliente, Vendedor, Nota Nro., Itens com Item/Descrição/Emb./Qtde). Outros layouts podem exigir ajuste no prompt — fácil de iterar.
- O endereço completo do cliente no PDF é ignorado; usamos apenas `cidade/uf` quando o código bate em `clientes`.
- Não importa preço (`Vlr.Unit`/`Valor Total`) — fora do escopo operacional do sistema.

### Resultado

Faturamento arrasta os PDFs do Sankhya para o sistema, revisa em uma tela só (marca rupturas se já souber que vai faltar), clica salvar e o pedido entra na etapa de Vendas pronto pra Logística — eliminando a digitação dupla.

