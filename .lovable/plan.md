

## Trocar coluna "Rupturas" por "Horário Previsto" no Consolidado

### Diagnóstico

Na tabela desktop de `/consolidado`, a coluna **"Rupturas"** (linha 750 do header e células 824-836) ocupa um slot central que o usuário quer reaproveitar para exibir o **horário previsto** de carregamento — informação operacional muito mais útil no dia-a-dia (saber a janela esperada do veículo). O campo `horario_previsto` já existe em `carregamentos_dia` (`time without time zone`) e é preenchido durante o fechamento de carga (`FechamentoLoteDialog`/`AdicionarCargaDialog`).

A informação de ruptura **não pode se perder**: hoje ela só é exibida no desktop nessa coluna (no mobile já tem badge ao lado da placa, linhas 663-671). Vou preservar o acesso replicando o badge ao lado da placa também no desktop.

### Mudança 1 — agregar `horarioPrevisto` ao grupo

Em `src/pages/Consolidado.tsx`:

a) **`interface CargaGroup`** (linha 95): adicionar `horarioPrevisto: string | null`.

b) **`groupByCarga`** (linha 117): no inicializador do grupo (linha 124), pegar `horario_previsto` do primeiro item: `horarioPrevisto: item.horario_previsto ?? null`. Como todos os itens da mesma `carga_id` compartilham o mesmo horário (cascade no fechamento), pegar o primeiro é suficiente; se vier nulo no primeiro mas preenchido em outro, fazer fallback `g.horarioPrevisto ??= item.horario_previsto ?? null`.

c) **`sortAccessors`** (linha 450): adicionar `horarioPrevisto: (g) => g.horarioPrevisto ?? "99:99"` (nulos vão pro fim do sort ascendente).

### Mudança 2 — substituir coluna no desktop

a) **Header** (linha 750): trocar
```
<SortableTableHead sort={sort} sortKey="rupturaCount" ... className="text-center">Rupturas</SortableTableHead>
```
por
```
<SortableTableHead sort={sort} sortKey="horarioPrevisto" ... className="text-center">Hr. Previsto</SortableTableHead>
```

b) **Célula** (linhas 824-836): trocar todo o bloco do botão de ruptura por:
```tsx
<TableCell className="text-center text-xs font-mono">
  {g.horarioPrevisto
    ? g.horarioPrevisto.substring(0, 5)  // "HH:MM"
    : <span className="text-muted-foreground/40">—</span>}
</TableCell>
```
Formato `HH:MM` em pt-BR (consistente com `style/data-formatting`).

### Mudança 3 — preservar badge de ruptura ao lado da placa (desktop)

Para não perder o link rápido para `/rupturas?carga=...`, na célula da **Placa** (linha 797) trocar:
```tsx
<TableCell className="text-xs font-mono">{g.placa ?? "—"}</TableCell>
```
por uma célula com flex contendo a placa **+** o mesmo botão-badge usado hoje no mobile (linhas 664-671), só visível quando `g.rupturaCount > 0`. Mesma estética: `bg-destructive/10 text-destructive`, ícone `AlertTriangle`, navega para `/rupturas?carga=${nomeCarga||cargaId}`. `onClick` com `e.stopPropagation()` para não disparar o expand da linha.

### Mudança 4 — mobile permanece igual

O card mobile (linhas 650-732) já mostra o badge de ruptura ao lado da placa e **não tem** coluna "Rupturas" — não precisa alterar nada lá. Opcionalmente, posso adicionar uma linha no grid `Hr. Previsto` ao lado de `Data` para paridade. **Proposta**: adicionar.

No bloco linha 683-700, substituir a célula `Data` por uma com data + horário previsto:
```tsx
<div>
  <span className="text-muted-foreground">Data: </span>
  {format(new Date(g.data + "T12:00:00"), "dd/MM")}
  {g.horarioPrevisto && (
    <span className="ml-1 font-mono text-muted-foreground">
      · {g.horarioPrevisto.substring(0, 5)}
    </span>
  )}
</div>
```

### Fora do escopo

- Não alteramos nenhum dado do banco; `horario_previsto` já é capturado no fechamento.
- Não mexemos nos KPIs (continuam Veículos / Peso / Pedidos / No pátio / Carregando / Expedidos).
- Não mexemos no filtro "Etapa Portaria" nem no "Status".
- Página de Rupturas e o link via `?carga=...` continuam funcionando — apenas mudamos o ponto de entrada visual na tabela desktop.

### Validação (cenários)

1. Carga fechada com `horario_previsto = '08:30:00'` → coluna "Hr. Previsto" mostra `08:30`.
2. Carga sem horário previsto → mostra `—` em cinza claro.
3. Sort ascendente por "Hr. Previsto" → cargas com horário aparecem primeiro em ordem cronológica, sem horário no final.
4. Carga com rupturas no desktop → badge vermelho `⚠ N` aparece ao lado da placa, clicável, navega para `/rupturas?carga=...`.
5. Carga sem rupturas → só a placa, sem badge.
6. Mobile: linha "Data: 24/04 · 08:30" exibe data + horário lado a lado; badge de ruptura ao lado da placa permanece igual.

### Resultado

A coluna central da tabela desktop agora mostra o **horário previsto** de cada carga em formato `HH:MM` ordenável, dando ao operador a janela de expedição esperada. A informação de ruptura migra para um badge compacto ao lado da placa (mesmo padrão já usado no mobile), mantendo o acesso rápido à página de Rupturas e a consistência visual entre as duas visões.

