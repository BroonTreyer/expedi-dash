## Preencher Ordens de Carga em massa no Importar DACTE

Hoje, ao importar vários DACTEs em **Logística → CT-e**, cada item exige preencher a Ordem de Carga individualmente pelo `OrdemCargaPicker`. Vou adicionar um bloco de preenchimento em lote no topo da lista de itens, suportando 1 OC para todos ou várias OCs distribuídas.

### Mudanças (apenas UI, sem banco)

**`src/components/logistica/ImportarDacteDialog.tsx`** — adicionar barra "Preencher OCs em lote" visível quando há ≥2 itens com `status === "ok"`:

1. **Modo "Mesma OC para todos"** (padrão)
   - Um único campo OC com autocomplete (reusa `OrdemCargaPicker`).
   - Botão **Aplicar a todos** → seta `ordem_carga` (e `carga_id` se a OC tiver vínculo encontrado) em todos os itens `ok` que ainda estão sem OC.
   - Checkbox **"Sobrescrever OCs já preenchidas"** (desmarcado por padrão).

2. **Modo "Múltiplas OCs"** (toggle no canto)
   - `Textarea` aceitando OCs separadas por linha, vírgula ou espaço.
   - Botão **Distribuir** → atribui na ordem da lista de itens: 1ª OC → 1º item, 2ª OC → 2º item, etc.
     - Se houver menos OCs que itens, os restantes ficam vazios.
     - Se houver mais OCs que itens, mostra aviso "X OCs sobraram".
   - Para cada OC distribuída, faz `buscarCargasPorOrdem(oc)` e, se retornar exatamente 1, preenche também `carga_id` + `vinculo_status: "vinculado"` (mesmo comportamento do `updateOrdem` atual).
   - Botão **Limpar todas** que zera as OCs dos itens `ok`.

3. **Atalho rápido**: ao colar uma string com várias OCs no campo do modo "Mesma OC", detectar separadores (`,`, `\n`, `;`) e perguntar "Detectamos N OCs. Distribuir uma por item?" (toast com ação).

### Detalhes técnicos

- Reaproveitar a função interna `updateOrdem(fileId, ordem, picked?)` já existente; criar `bulkApply(ordens: string[])` que chama `updateOrdem` por item na sequência.
- Chamadas a `buscarCargasPorOrdem` em paralelo via `Promise.all`, com debounce visual (loading spinner no botão).
- Estado local novo: `modoBulk: "uma" | "varias"`, `bulkOrdem: string`, `bulkLista: string`, `sobrescrever: boolean`.
- Layout: card compacto com fundo `bg-muted/30`, `border-dashed`, posicionado entre o uploader e a lista de itens; só aparece quando `items.filter(i => i.status === "ok").length >= 2`.
- Ordem de itens segue a ordem do array `items` (que reflete a ordem de upload), igual ao que o usuário já vê.

### Fora de escopo

- Não mexe no `FechamentoLoteDialog` (fluxo de OC por grupo no fechamento de carga já existe).
- Sem alteração de schema, RLS, edge functions ou hooks.
