## O que o print pede

> "bom dia.. temos q ver essa data.. pq ficou para carregar hoje.. tinha q aparece no painel de hoje.. as pendentes.. ele só aparece se eu voltar a data.."

No print há um pedido com **data 13/05/2026**, status **"Pronto para carregar"** e badge **"Carga … aguardando finalizar"** (faltam etapas de portaria pra ser "Carregado"). Hoje é 18/05. O usuário diz: *esse pedido ficou pendente, era pra aparecer no painel de hoje automaticamente* — mas só aparece quando ele volta o filtro para 13/05.

## Diagnóstico

Existe carry-over no `useCarregamentos.ts` (linhas 140-144):

```ts
if (isSingleDay && dateFrom === todayStr) {
  q = q.or(`data.eq.${dateFrom},and(data.lt.${dateFrom},data.gte.${limitDate},status.neq.Carregado)`);
}
```

A query traz todos os pendentes dos últimos 30 dias. **Esse pedido vem do banco.**

O problema está no filtro de exibição do painel (`src/pages/Index.tsx`, linha 142):

```ts
if (!showLogistica && c.etapa === "logistica") return false;
```

O pedido do print tem `etapa = 'logistica'` (já passou pra logística e foi anexado numa carga fechada), com `status = 'Pronto para carregar'` (ainda não "Carregado" porque a portaria não finalizou). Por padrão `showLogistica = false`, então o painel principal **esconde esse registro**. Ele só "reaparece" quando o usuário muda a data porque o usuário também alterna o toggle, ou porque o item vira o único da listagem ali.

Confirmação no banco:

```
data        | status               | etapa     | count
2026-05-13  | Carregado            | logistica | 108
2026-05-14  | Pronto para carregar | vendas    | 3      ← carry-over funcionando
2026-05-15  | Pendente / Problema  | vendas    | 51     ← carry-over funcionando
... (etapa=logistica + status != Carregado) → escondidos
```

Resumo: o carry-over funciona pra `etapa=vendas`, mas **não** pra `etapa=logistica` (pedidos já em carga fechada aguardando finalização).

## Mudanças propostas

### 1. Carry-over inclui também logística pendente (`src/pages/Index.tsx`)

Tornar o filtro de etapa **insensível** para itens de carry-over (data < hoje). Itens do dia atual continuam respeitando o toggle "Mostrar logística".

```ts
const hojeStr = new Date().toISOString().split("T")[0];

const filtered = useMemo(() => {
  return carregamentos.filter((c) => {
    const ehCarryOver = c.data < hojeStr && c.status !== "Carregado";

    // Toggle logística aplica-se só ao dia corrente
    if (!ehCarryOver) {
      if (showLogistica && c.etapa !== "logistica") return false;
      if (!showLogistica && c.etapa === "logistica") return false;
    }

    // Mantém: esconde só os efetivamente finalizados
    if (c.carga_id != null && c.status === "Carregado") return false;
    // ...restante dos filtros sem mudança
  });
}, [carregamentos, filters, showLogistica]);
```

### 2. Indicador visual de carry-over

No render da linha do painel, quando `c.data !== hoje`, mostrar um chip discreto **"Atrasado · DD/MM"** ao lado do número do pedido (cor `text-amber-600` / `bg-amber-50`, sem usar vermelho — vermelho fica reservado para Ruptura conforme regra de design). Assim o operador entende rapidamente que aquele item não é de hoje, é arrasto.

### 3. KPIs continuam consistentes

`kpiSource` (linhas 158-) já ignora o toggle de etapa — não precisa mudar. O peso/qtd dos atrasados já entram nos KPIs do topo (que o print mostra "93.960,16 kg"). Nada a alterar.

### 4. Sem mudança de query nem de banco

O `useCarregamentos` já traz tudo certo. Mudança é puramente de exibição. Sem migration, sem alterar RLS.

## Fora de escopo

- Não mudar o toggle "Mostrar logística" (continua filtrando o dia corrente).
- Não mexer no Consolidado (regra própria de carry-over de 30 dias).
- Não criar nova coluna no banco para marcar "atrasado" — derivado em tempo de render.

## Detalhes técnicos

- Arquivo único alterado: `src/pages/Index.tsx`.
- O chip "Atrasado · DD/MM" será adicionado dentro do componente `LinhaCarregamento` ou no card mobile equivalente — verificar onde está renderizada a linha (próxima exploração no build).
- `c.data` é string `YYYY-MM-DD`, comparação lexicográfica com `hojeStr` funciona.
- Carry-over de logística respeita `status !== 'Carregado'` (mesma regra da query) — itens "Carregado" continuam fora do painel principal.
