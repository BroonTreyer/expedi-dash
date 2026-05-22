# Alinhar contagem de ruptura em Pré-cargas com a tela Rupturas

A divergência (286.100 kg + 2.301 unid vs. 287.535 kg) acontece porque a Pré-cargas: (a) soma ruptura parcial junto da total, (b) joga o peso teórico do Pão de Alho dentro do kg em vez de contar como unidade. Vou alinhar **tudo da Pré-cargas** com a regra que a Rupturas já usa.

## Mudanças (apenas em `src/pages/PreCargas.tsx`)

1. **Trocar regra de ruptura por item**
   - Só conta ruptura quando `ruptura === true` (ruptura **total**). Parcial e `ruptura_sinalizada` deixam de entrar no KPI/badge de ruptura.
   - Produtos por unidade (Pão de Alho via `isPorUnidade`) vão para um novo acumulador `unidRuptura` (em UNID), **não somam no kg**.
   - Produtos por kg continuam alimentando `pesoRuptura` usando `pesoNaoCarregado`.

2. **Atualizar agregações**
   - `PedidoGrupo` e `PreCargaGrupo` ganham campo `unidRuptura`.
   - O loop que monta cada pedido/carga divide o item entre kg/unid antes de somar.
   - `qtdRupturas` passa a contar só itens com `ruptura === true`.

3. **Atualizar exibição**
   - KPI "Em ruptura": mostra `"X kg"` no valor principal e sub-linha `"Y unid"` quando houver Pão de Alho em ruptura. Sem ruptura → `—`.
   - Badge da carga (`PreCargaCard`): em vez de `"N rupturas · X kg"` passa a `"N rupturas · X kg · Y unid"` (a parte de unid só aparece quando >0).
   - Linha do pedido (`PedidoRow`): badge mostra kg e/ou unid conforme tiver.
   - Chips dos itens em ruptura: para Pão de Alho mostra `"— N unid"` em vez de `"— N kg"`.

4. **Não mexer em `pesoEmbarcado` / `pesoTotal`**
   - Continuam usando `pesoEfetivo` (peso físico real), porque servem para roteirização/limite de caminhão. Só o bloco de "ruptura" muda.

## Resultado esperado

Tela Pré-cargas passa a mostrar exatamente os mesmos números da tela Rupturas: 286.100 kg + 2.301 unid (no exemplo do print), eliminando os ~1.435 kg fantasmas.

## Fora de escopo

- Não muda regra de visibilidade (Pré-cargas continua mostrando cargas em etapa "logistica" — isso é proposital, já que o objetivo da página é justamente listar as pré-cargas, mesmo já avançadas).
- Não mexe em `Rupturas.tsx`, exports, impressão, nem em backend.
