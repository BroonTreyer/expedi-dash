
## O que o usuário quer

Um bloco "Cargas Fechadas com Pendência" na página Rupturas, logo abaixo do "Resumo por Produto". Ele quer identificar cargas que foram fechadas (têm `carga_id` e `nome_carga`) mas ainda contêm itens com `ruptura = true` — ou seja, cargas expedidas/fechadas que ainda dependem de produto.

## Como identificar "carga fechada com pendência"

Nos dados já carregados (`carregamentos` do `useCarregamentos`), uma carga está "fechada" quando:
- O item tem `carga_id` preenchido (foi incluído em algum fechamento de lote)
- E tem `ruptura = true`

O agrupamento é feito por `nome_carga` (ou `carga_id`). Para cada carga com ao menos 1 ruptura, mostrar:
- Nome da carga
- Qtd de rupturas pendentes
- Peso total em ruptura
- Produtos pendentes (lista)
- Status predominante das rupturas (ex: "Aguardando Produto")

**Importante:** sem filtros de vendedor/carga/busca — este bloco usa **todos os carregamentos** do período (não só os filtrados), para não esconder cargas afetadas.

## Estrutura do bloco

```
┌─────────────────────────────────────────────────────┐
│ 🔴 Cargas Fechadas com Pendência (3)                │
├─────────────────────────────────────────────────────┤
│ CARGA-001   │ 4 rupturas │ 2.340 kg │ [Aguardando]  │
│   Produto A (2x), Produto B (2x)                    │
├─────────────────────────────────────────────────────┤
│ CARGA-002   │ 1 ruptura  │  560 kg  │ [Rom.Lib.]    │
│   Produto C (1x)                                    │
└─────────────────────────────────────────────────────┘
```

No mobile: cards empilhados. No desktop: tabela.

## Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `src/pages/Rupturas.tsx` | 1) Novo `useMemo` `cargasComPendencia` — agrupa carregamentos com `ruptura=true` E `carga_id` preenchido, por `nome_carga`; 2) Renderizar bloco logo abaixo de "Resumo por Produto" |

### Lógica do `cargasComPendencia`

```ts
const cargasComPendencia = useMemo(() => {
  // Usar todos carregamentos (sem filtros), para não perder cargas
  const map = new Map<string, {
    nome_carga: string;
    carga_id: string;
    count: number;
    peso: number;
    produtos: Map<string, { nome: string; count: number }>;
    statuses: Set<string>;
  }>();
  
  for (const c of carregamentos) {
    if (!c.ruptura || !c.carga_id) continue; // só fechadas com ruptura
    const key = c.carga_id;
    if (!map.has(key)) {
      map.set(key, {
        nome_carga: c.nome_carga ?? c.carga_id,
        carga_id: c.carga_id,
        count: 0, peso: 0,
        produtos: new Map(),
        statuses: new Set(),
      });
    }
    const g = map.get(key)!;
    g.count++;
    g.peso += c.peso ?? 0;
    g.statuses.add(c.status);
    const pk = c.codigo_produto || "SEM_COD";
    const existing = g.produtos.get(pk);
    if (existing) existing.count++;
    else g.produtos.set(pk, { nome: c.nome_produto || c.codigo_produto || "—", count: 1 });
  }
  
  return [...map.values()].sort((a, b) => b.count - a.count);
}, [carregamentos]);
```

### Visual do bloco

- Cabeçalho vermelho/laranja (tom diferente do amarelo de rupturas normais) com `Truck` icon e contador
- Se `cargasComPendencia.length === 0`: bloco não renderizado
- Desktop: tabela com colunas: Carga | Rupturas | Peso | Status | Produtos pendentes
- Mobile: cards com as mesmas infos
- Badge de status de ruptura reaproveitando `RUPTURA_STATUS_COLORS` para colorir os status de cada carga
- Clicar no nome da carga aplica o `cargaFilter` para filtrar a lista abaixo
