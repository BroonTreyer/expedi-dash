## Objetivo

Adicionar campo **Ordem de Carga** no Fechar Carga. Esse número fica gravado em todos os pedidos da carga e, ao importar um DACTE, o usuário digita a Ordem de Carga e o sistema sugere/vincula a carga correspondente automaticamente (busca nas cargas disponíveis).

## Mudanças

### 1. Migration (schema)
- `ALTER TABLE carregamentos_dia ADD COLUMN ordem_carga text` + índice.
- `ALTER TABLE ctes_dacte ADD COLUMN ordem_carga text` + índice.

### 2. Fechar Carga — `src/components/dashboard/FechamentoLoteDialog.tsx`
- Novo state `ordemCarga` + `<Input>` "Ordem de Carga *" no bloco "Dados de Transporte" (ao lado de "Nome da Carga").
- Obrigatório (entra em `canSubmit`).
- Inclui `ordem_carga` em cada update do batch e atualiza tipo do `onSubmit`.
- Reset no `useEffect(open)`.

### 3. Tipos / hook
- `src/hooks/useCarregamentos.ts`: adicionar `ordem_carga?: string | null` ao tipo `Carregamento`.
- `src/hooks/useCtesDacte.ts`: adicionar `ordem_carga` ao tipo `CteDacteRow`.

### 4. Vinculação por Ordem de Carga — `useCtesDacte.ts`
- Nova função `buscarCargaPorOrdem(ordem: string)` → consulta `carregamentos_dia` distinct `(carga_id, nome_carga, placa, transportadora, motorista, data)` onde `ordem_carga ilike %ordem%` e `etapa = 'logistica'`. Retorna lista para autocomplete.
- `autoVincularCarga` aceita `ordemCarga?`: se informado e match único, retorna `vinculado`. Fallback NF mantido.

### 5. Importar DACTE — `src/components/logistica/ImportarDacteDialog.tsx`
- Campo manual **Ordem de Carga** com autocomplete (Command/Popover):
  - Usuário digita → debounce 300ms → busca cargas disponíveis (via `buscarCargaPorOrdem`).
  - Mostra lista: `Ordem · Nome da carga · Placa · Transp.` Selecionar preenche `carga_id` e `ordem_carga` no registro.
  - Se nada selecionado mas valor digitado, ainda salva o texto em `ordem_carga` e tenta auto-vincular no insert.
- Passa `ordem_carga` para `useInsertCteDacte`.

### 6. Tabela de CT-es — `src/components/logistica/CtesDacteTab.tsx`
- Nova coluna **Ordem** entre "Carga" e "Status".
- Inclui `ordem_carga` no filtro de busca textual.

## Comportamento

```text
Fechar Carga (digita "OC-1234")
        ↓
Todos pedidos da carga gravam ordem_carga = "OC-1234"
        ↓
Importar DACTE → usuário digita "OC-12" → autocomplete sugere "OC-1234 · Carga MG Norte · ABC1234"
        ↓
Selecionado → CT-e fica vinculado àquela carga (status 'vinculado')
```

Cargas antigas sem `ordem_carga` continuam usando o fallback por NFs.
