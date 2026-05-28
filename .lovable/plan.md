## Corrigir comprovante de adiantamento — agrupar por carga, peso do romaneio, Pix único

### Problemas confirmados nos dados

Para o caso do exemplo (5 adiantamentos da MOREIRA, ADT-20260528-001..010):

1. **1 adiantamento por CTE** — `qtd_ctes=1` em todos. Como o diálogo itera por adiantamento, repete o cabeçalho `MOREIRA…` e o bloco Pix 5 vezes.
2. **Peso por CTE, não do romaneio** — todos os 5 CTEs apontam para `carga_id=CG-…JDJ` (EDIVAR ROTA CARRO 2). O romaneio (soma de `carregamentos_dia.peso` da carga) é **32.900 kg**, mas hoje o comprovante imprime o `peso_total` de cada CTE separadamente (e o CTE 740 vem com 0 kg do DACTE).
3. **Pix duplicado** — bloco Pix é gerado dentro do `forEach(adiantamentos)`, sem deduplicar por `transportadora_id`.

### Saída esperada (mesmo input)

```text
ADIANTAMENTO DE FRETE CIF, FORA DO ESTADO.

MOREIRA TRANSPORTES E LOG LTDA
1. EDIVAR ROTA CARRO 2 (32.900 KG)  CTE 736/737/738/739/740    VLR R$ 38.844,80

Valor Total do Frete R$ 38.844,80

80% de Adiantamento

R$ 31.075,84

Código 32982 – MOREIRA TRANSPORTES E LOG LTDA
Pix: moreiratransportes21@gmail.com
```

### Mudanças em `src/components/logistica/ComprovanteAdiantamentoDialog.tsx`

1. **Buscar peso do romaneio por carga**
   - Novo `useQuery(["adt_pesos_romaneio", cargaIds])` que faz `SELECT carga_id, SUM(COALESCE(peso, peso_original, 0)) FROM carregamentos_dia WHERE carga_id IN (...) GROUP BY carga_id`.
   - Retorna `Record<string, number>` com peso real da carga (somando todas as linhas).
   - Fallback quando carga_id é nulo ou retorno vazio: usar soma de `cte.peso_total`.

2. **Reescrever a montagem do texto** — substituir o `forEach(adiantamentos)` por uma agregação global:
   - Agrupar **todos** os CTEs de **todos** os adiantamentos selecionados primeiro por `transportadora_id` e depois por `carga_id` (ou `ordem_carga`/"sem" como hoje).
   - Cada grupo de carga acumula: `valor` (soma de `valor_frete` dos itens vinculados), `numeros_cte` (lista única), `label` (nome_carga via `nomesCargas` ou ordem_carga).
   - **Peso**: usar `pesosRomaneio[carga_id]` se houver; senão, somar `cte.peso_total` do grupo.
   - Imprimir 1 cabeçalho de transportadora por bloco; numeração contínua por carga (não por CTE).

3. **Bloco Pix deduplicado**
   - Reduzir `adiantamentos` para um `Map<transportadora_id, info>` único e imprimir `Código X – Nome` + `Pix: …` uma única vez por transportadora.

4. **Modo QUITAÇÃO**
   - Aplicar a mesma lógica de agregação por carga (peso do romaneio, números de CTE concatenados, Pix único).
   - Manter linha por adiantamento de `Adt pago / Saldo` se houver mais de um adiantamento da mesma transportadora — eles são quitações distintas que precisam ficar discrimináveis. (Vou manter o resumo agregado embaixo como já está.)

5. **% de adiantamento**
   - Manter regra atual: se todos os adiantamentos têm o mesmo `percentual`, mostra "X% de Adiantamento" + total uma única vez; senão fallback para "Total Adiantamento".

### Sem mudanças

- Schema do banco, RLS, hooks de mutação, fluxo de marcar pago/quitar.
- Outras telas de adiantamento.

### Validação

- Recopiar o texto com os mesmos 5 adiantamentos da MOREIRA e conferir que produz exatamente 1 linha de carga (32.900 kg, 5 CTEs concatenados) + 1 Pix.
- Selecionar adiantamentos de transportadoras diferentes para garantir que ainda separa por transportadora.
- Selecionar um adiantamento com CT-e sem `carga_id` para garantir fallback "Sem carga" + peso somado dos CTEs.
