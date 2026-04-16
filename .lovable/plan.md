

## Diagnóstico

**O que aconteceu:**
- Às 17:05 hoje, logística@frico.ind.br fechou a carga **"EDIVAR ROTA"** com 23 pedidos (vendedor Edivar) → status mudou para etapa "logistica", carga_id = "EDIVAR ROTA".
- Às 17:49:45, o **mesmo usuário clicou em "Apagar carga"** dentro do diálogo de Editar Carga → o botão funcionou exatamente como projetado: deletou todos os 23 pedidos com `carga_id = 'EDIVAR ROTA'`.
- Não foi um bug — foi o comportamento intencional do botão "Apagar carga inteira" (que tem confirmação `DeleteConfirmDialog`). O usuário provavelmente confundiu "Apagar carga" com "remover apenas um pedido" ou fechou o aviso sem ler.

**Por que apagou TUDO:** O botão "Apagar carga" executa `DELETE FROM carregamentos_dia WHERE carga_id = 'EDIVAR ROTA'` — apaga todos os pedidos do agrupamento, não só um item. Isso é diferente do "X" ao lado de cada pedido (que apenas remove o pedido da carga, mantendo-o na etapa Vendas).

**Boa notícia:** o `audit_log` guarda o registro completo de cada pedido em `changes->'novo'` no momento da criação. Conseguimos reconstruir 100% dos 23 pedidos exatamente como estavam.

## Plano de recuperação + prevenção

### Etapa 1 — Restaurar os 23 pedidos da carga EDIVAR ROTA

Script SQL que:
1. Lê os 23 IDs deletados em `audit_log` (action='excluido', entity_type='carregamento', criados em 17:49:45 hoje).
2. Para cada ID, busca a entrada `criado` correspondente e extrai `changes->'novo'` (o snapshot completo da linha).
3. Aplica por cima as últimas alterações registradas em audit_log (`carga_id`, `nome_carga`, `etapa`, `placa`, `motorista`, `transportadora`, `tipo_caminhao`, `ordem_entrega`) para restaurar o estado pós-fechamento.
4. `INSERT` nas mesmas linhas (mesmos UUIDs) em `carregamentos_dia`.

Verificação prévia: contar quantos dos 23 IDs têm `changes->'novo'` disponível antes de executar. Se algum estiver faltando, restaurar pelo menos os que têm e reportar os ausentes.

### Etapa 2 — Prevenir novo acidente (mudança no UI)

No `DeleteConfirmDialog` chamado a partir de "Apagar carga inteira" no `EditarCargaDialog`:

- **Tornar a confirmação mais explícita**: em vez de só "Confirmar/Cancelar", exigir que o usuário **digite o nome da carga** (ex: "EDIVAR ROTA") em um input para liberar o botão "Apagar".
- Mudar o texto do botão no rodapé do diálogo de "Apagar carga" para **"Apagar carga inteira (N pedidos)"** mostrando explicitamente quantos pedidos serão removidos.
- Adicionar variant visualmente mais destacada (já é destructive, mas adicionar um aviso vermelho expandido na descrição: "Esta ação apagará permanentemente os N pedidos. Para remover apenas um pedido, use o ícone X ao lado dele.").

### Arquivos

| Arquivo | Ação |
|---------|------|
| Restauração via SQL (insert tool) | Reconstruir 23 linhas em `carregamentos_dia` a partir do `audit_log` |
| `src/components/dashboard/EditarCargaDialog.tsx` | Mudar texto do botão para incluir contagem; descrição do `DeleteConfirmDialog` mais clara |
| `src/components/dashboard/DeleteConfirmDialog.tsx` | Suportar prop opcional `confirmText` que exige digitar um texto para liberar o botão Apagar |

### Resultado esperado

- Os 23 pedidos da carga EDIVAR ROTA voltam a aparecer no Consolidado/Painel exatamente como estavam (mesma carga, mesma rota, mesmas ordens de entrega).
- Próxima vez que alguém clicar "Apagar carga inteira", terá que digitar o nome da carga para confirmar — bloqueia cliques acidentais.

