## Objetivo
Ao importar um DACTE/CT-e, validar o **TOMADOR** do serviço. Se for diferente de **Frico**, o item é **recusado** (não pode ser salvo) e a recusa fica visível no card.

## Comportamento
- A IA extrai o nome do tomador do CT-e (normalmente o quadro "TOMADOR DO SERVIÇO").
- Comparação tolerante: normaliza para minúsculas, remove acentos e símbolos; aceita se o nome contiver `"frico"` (cobre "FRICO ALIMENTOS", "FRICO ALIMENTOS LTDA", etc.).
- Itens cujo tomador **não** contém `"frico"` ficam com status visual **Recusado** (badge vermelho com o nome do tomador detectado) e são bloqueados no Salvar.
- Se o tomador vier vazio/ilegível, o item entra como **Tomador não identificado** (badge âmbar) — também bloqueado para salvar, mas o usuário pode editar manualmente o campo Tomador no formulário para liberar.

## Arquivos a alterar

### 1. `supabase/functions/parse-dacte-pdf/index.ts`
- Acrescentar no `SYSTEM_PROMPT` extração do `tomador` (razão social do quadro "TOMADOR DO SERVIÇO" — se ausente, usar a razão social do destinatário ou expedidor conforme indicado como tomador no CT-e).
- Acrescentar `tomador: { type: "string" }` no schema do tool `extract_dacte` (não obrigatório).

### 2. `src/components/logistica/ImportarDacteDialog.tsx`
- Adicionar `tomador?: string` ao tipo `Parsed`.
- Helper `isFrico(s) = normaliza(s).includes("frico")` (lowercase + `normalize("NFD").replace(/[\u0300-\u036f]/g, "")`).
- No `handleFiles`, ao montar `newItems`, computar:
  - `tomadorOk = !!parsed.tomador && isFrico(parsed.tomador)`
  - se `parsed.tomador` existe mas não é Frico → `status: "rejected"`, `error: "Tomador não é Frico: <nome>"`.
  - se `parsed.tomador` ausente → status `"ok"` mas `tomadorOk = false` (badge âmbar).
- Adicionar `"rejected"` ao union de `Item.status`.
- Renderizar badge:
  - `rejected` → `Badge variant="destructive"` com `AlertTriangle` e o nome detectado.
  - âmbar quando tomador vazio.
- Mostrar campo **Tomador** (read-only se Frico, editável se vazio) no grid do formulário, antes de "Transportadora".
- `okCount` passa a contar apenas itens com `status === "ok" && tomadorOk`.
- `handleSaveAll` ignora rejeitados; toast informa quantos foram pulados.
- Bulk fill (Mesma OC / Múltiplas OCs) também ignora `rejected` (já filtra `status === "ok"`, mantém).

## Fora de escopo
- Sem mudança de banco/coluna nova (`tomador` fica em `raw_extracao` e na UI; opcionalmente persistido apenas dentro do JSON de extração).
- Sem mudança em outras telas (Relatórios, Logística etc.).
