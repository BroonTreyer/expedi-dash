

## Auditoria concluída: a origem do “uma ação cria várias IDs”

### Diagnóstico confirmado

O problema **não é mais trigger duplicado** no banco.

Hoje, no backend, existe apenas **1 trigger de auditoria por tabela**:
- `carregamentos_dia` → `audit_carregamentos_trigger`
- `movimentacoes_portaria` → `audit_movimentacoes_trigger`
- `veiculos_esperados` → `audit_veiculos_esperados_trigger`

Também validei o histórico recente e **não há duplicatas idênticas** no `audit_log` nos últimos dias. Ou seja:

- não está gravando a mesma linha 2x
- o que aparece como “muitas IDs” são **muitos registros diferentes**
- a tela `/logs` está exibindo a auditoria **linha a linha, por item**, sem agrupar a ação lógica

### Fonte real do comportamento

A tabela `carregamentos_dia` é **itemizada**: uma carga/pedido pode ter vários produtos, e cada produto é uma linha com `id` próprio.

Então, quando o usuário executa **uma ação lógica**, o sistema pode alterar **várias linhas físicas**. O trigger registra corretamente **uma auditoria por linha alterada**.

#### Fontes de fan-out encontradas

1. **Mudança de status em grupo na tabela**
   - `src/components/dashboard/CarregamentoTable.tsx`
   - no cabeçalho do grupo:
   ```tsx
   onChange={(s) => group.items.forEach(i => onStatusChange(i.id, s))}
   ```
   Isso dispara 1 atualização por item do grupo.

2. **Fechamento de carga em lote**
   - `src/components/dashboard/FechamentoLoteDialog.tsx`
   - gera `updates` para todos os itens selecionados.
   - `src/pages/Index.tsx` → `handleLoteSubmit`
   - chama `batchUpdateMut.mutate(updates)`

3. **Desfazer carga**
   - `src/pages/Index.tsx` → `handleUndoCargaConfirm`
   - faz:
   ```tsx
   .update(...).eq("carga_id", undoCargaId)
   ```
   Isso altera todos os itens da carga.

4. **Edição cascata de pedido multi-item**
   - `src/pages/Index.tsx`
   - ao editar um item, campos compartilhados propagam para irmãos do mesmo pedido/data:
   ```tsx
   const siblingUpdates = siblings.map(...)
   batchUpdateMut.mutate(siblingUpdates)
   ```

5. **Edição de carga no Consolidado**
   - `src/pages/Consolidado.tsx`
   - update em massa por `carga_id`
   - mais updates individuais por item para peso/motivo de ruptura

### Evidência do caso atual

Na captura da página `/logs`, os eventos das **17:11:12** com ação **“Alterado”** e mudança `status: Aguardando → Pronto para carregar` não são clones.

Eles são vários `entity_id` diferentes porque a ação atingiu **vários itens da carga** ao mesmo tempo. O backend está auditando por item; a UI está mostrando isso sem agrupamento.

## Problema raiz

Há dois problemas diferentes:

### 1. Semântica da auditoria
O `audit_log` usa:
- `entity_type`
- `entity_id`

Mas em `carregamentos_dia`, esse `entity_id` é o **UUID do item**, não o identificador lógico da operação (`carga_id`, `numero_pedido`, etc.).

### 2. Apresentação da tela Logs
A página `src/pages/Logs.tsx`:
- lista tudo em modo bruto
- mostra `entity_id.slice(0, 8)`
- não agrupa por ação lógica
- não mostra claramente quantos itens foram afetados na mesma operação

Isso faz parecer bug, quando parte do efeito é **esperado pelo modelo atual**.

## Plano de correção

### Etapa 1 — Reduzir fan-out desnecessário no frontend
Ajustar fluxos que hoje disparam N callbacks separados quando a intenção é “uma ação em lote”.

#### Mudanças
- `src/components/dashboard/CarregamentoTable.tsx`
  - trocar:
  ```tsx
  group.items.forEach(i => onStatusChange(i.id, s))
  ```
  por um handler de lote vindo da página.

- `src/pages/Index.tsx`
  - criar um `handleGroupStatusChange(ids, status)` usando `batchUpdateMut`
  - manter update individual só para item isolado

Resultado:
- menos tempestade de requests
- comportamento mais previsível
- mesma rastreabilidade por item, mas com execução mais limpa

### Etapa 2 — Agrupar eventos na tela `/logs`
Reescrever a leitura/apresentação dos logs para exibir **ações lógicas agrupadas**.

#### Estratégia de agrupamento
Agrupar linhas quando coincidirem:
- `user_email`
- `action`
- `entity_type`
- `changes` equivalentes
- timestamps iguais ou muito próximos
- e, para carregamentos, preferir chave lógica derivada de:
  - `carga_id`
  - ou `numero_pedido`
  - ou fallback por conjunto afetado

#### UI nova na página Logs
Cada grupo exibirá:
- data/hora
- usuário
- ação
- entidade
- quantidade de itens afetados
- identificador lógico principal (`carga_id` / pedido / cliente), quando existir
- expandir para ver os `entity_id` filhos

Exemplo visual esperado:
```text
23/04 17:11:12 | logistica@... | Alterado | Carregamento
54 itens afetados | Carga ELIAS + EDIVAR
status: Aguardando → Pronto para carregar
[expandir]
  - 2a45d2b1...
  - 575f0013...
  - 32f54d7b...
```

### Etapa 3 — Melhorar o modelo de correlação de auditoria
Adicionar um identificador de operação para correlacionar ações em lote de forma nativa.

#### Opção recomendada
Expandir `audit_log` com colunas como:
- `operation_id`
- `logical_entity_type`
- `logical_entity_id`

Exemplos:
- `logical_entity_type = 'carga'`
- `logical_entity_id = 'ELIAS + EDIVAR'`

Assim:
- o log por item continua existindo
- mas a ação pai fica claramente rastreável

### Etapa 4 — Popular esses campos nos fluxos de lote
Nos fluxos principais:
- fechamento de carga
- mudança de status em grupo
- desfazer carga
- edição de carga no consolidado
- cascata de pedido multi-item

gerar um `operation_id` e associar a operação inteira.

## Validação após a correção

### Casos para testar
1. Alterar status de um grupo com vários produtos.
2. Fechar uma carga com vários itens.
3. Desfazer uma carga.
4. Editar uma carga no Consolidado.
5. Editar um pedido multi-item com propagação.

### Resultado esperado
- o banco continua auditando corretamente
- a tela Logs passa a mostrar **1 ação lógica agrupada**, não dezenas de linhas aparentemente repetidas
- quando necessário, continua possível expandir e ver os itens individuais

## Fora do escopo

- apagar logs históricos válidos só porque são multi-item
- remover rastreabilidade por item
- alterar o modelo multi-produto de `carregamentos_dia`

## Conclusão

A auditoria mostrou que o erro principal hoje é uma combinação de:

1. **ações em lote sobre uma tabela itemizada**
2. **fan-out em alguns handlers do frontend**
3. **tela de Logs exibindo auditoria bruta por item, sem agrupamento**

Ou seja: a fonte do “uma ação gera várias IDs” é **principalmente estrutural/UI**, e não mais uma duplicação indevida do banco.

