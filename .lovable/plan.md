## Objetivo

Permitir buscar uma carga antiga em `Consolidado` pelo **número da ordem de carga** (`ordem_carga`), sem precisar adivinhar a data.

## Comportamento

- Adicionar um campo `Input` "Buscar OC..." na barra de filtros, ao lado dos filtros de UF/Status.
- Enquanto o campo estiver vazio, a página funciona exatamente como hoje (intervalo de datas).
- Quando o usuário digita um número:
  - Ignoramos o filtro de datas e executamos uma busca direta em `carregamentos_dia` por `ordem_carga ilike %termo%`, com `carga_id not null` e `etapa neq pre_carga`, paginada via `fetchAllPaginated`.
  - Limitamos a um máximo razoável (ex.: últimos 365 dias) para não varrer o banco inteiro; se nada for encontrado, mostramos mensagem "Nenhuma OC encontrada".
  - Os resultados entram no mesmo pipeline atual (`groupByCarga`, agrupamento, tabela), então a UI fica idêntica.
- Debounce de 300ms para não disparar a busca a cada tecla.

## Arquivos

`src/pages/Consolidado.tsx`:
1. Novo estado `searchOC` (string).
2. Em `useConsolidado`, aceitar um terceiro parâmetro opcional `ordemCarga?: string`; quando presente, trocar o filtro de data por `.ilike("ordem_carga", `%${ordemCarga}%`)` + `.gte("data", hoje-365d)`.
3. Adicionar `Input` na barra de filtros (placeholder "Buscar nº OC..."), com ícone de lupa, limpar com X.
4. Quando `searchOC` estiver preenchido, desabilitar visualmente o seletor de período (com tooltip explicando) e exibir um pequeno aviso "Buscando em todo o histórico".

Nenhuma alteração em schema ou edge function — apenas leitura.

## Validação

- Buscar uma OC conhecida: aparece o registro mesmo se a data atual estiver filtrada para hoje.
- Limpar a busca: a lista volta ao comportamento por data.
