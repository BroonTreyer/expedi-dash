

## Diagnóstico: cadastros 33996 e 33995 não chegaram ao banco

### O que verifiquei

1. **Tabela `clientes`** — busca por `33996`, `33995` (e variações com zeros à esquerda / substring): **0 registros**.
2. **`clientes` criados nos últimos 3 dias**: **0 registros**. Nenhum cliente novo foi inserido recentemente.
3. **`audit_log`** (entity_type `cliente`, últimos 2 dias): **vazio**. Como o trigger `audit_generic_cadastro` registra todo INSERT/UPDATE/DELETE, isso confirma que **nenhum INSERT chegou a ser executado**.
4. **Logs do Postgres** (ERROR/FATAL últimos 2 dias): nada relacionado a `clientes`.

### Conclusão

Os dois cadastros **não foram salvos** — não foi perda de dados nem reversão. O clique em "Salvar" não chegou a disparar um INSERT bem sucedido. As causas possíveis, em ordem de probabilidade:

1. **Toast de erro foi exibido e ignorado.** O `useCreateCliente` (`src/hooks/useClientes.ts`) faz uma pré-checagem `SELECT … WHERE codigo_cliente = …`. Se o código informado tinha um espaço, zero à esquerda, ou bateu com outro registro, aparece toast: *"Já existe um cliente com o código …"* e o dialog **fecha sem salvar**. Vale conferir se o código foi digitado exatamente como `33996`/`33995` (sem espaços, sem zeros à esquerda).
2. **Sessão expirou no momento do clique.** Sem sessão válida, o INSERT é bloqueado pela RLS (`Ops insert clientes`) e retorna erro silencioso no toast — também sem deixar rastro no audit_log.
3. **Dialog fechado antes do `onSuccess`** (clique fora / ESC durante o request lento). Hoje o botão Salvar não bloqueia o overlay; se o usuário fechar antes, a chamada continua, mas se tiver dado erro, o toast some junto.

### Plano de ação (a ser executado no modo padrão após aprovação)

**A. Recadastrar agora os dois clientes** que faltam — preciso só dos dados:
- Código `33996` — nome / cidade / UF / CEP
- Código `33995` — nome / cidade / UF / CEP

Faço o INSERT direto na tabela `clientes` (mais rápido e garantido) ou você reabre o cadastro pela tela.

**B. Endurecer o cadastro de cliente para evitar repetição** (`src/hooks/useClientes.ts` + `src/pages/Clientes.tsx`):
1. **Normalizar `codigo_cliente`** antes de checar duplicidade e antes do INSERT (`trim()` já existe na checagem, mas não no payload final). Garantir mesma normalização nos dois pontos.
2. **Não fechar o Dialog em caso de erro** — hoje `setOpen(false)` só roda em `onSuccess`, mas se o usuário clicar fora durante o submit, perde-se contexto. Adicionar `onOpenChange` que ignora fechamento enquanto `isSubmitting === true`.
3. **Mensagem de erro persistente dentro do Dialog** (alerta inline, além do toast) para os erros de duplicidade / RLS / sessão expirada — assim o usuário vê o motivo mesmo se o toast desaparecer.
4. **Logar tentativa de criação no `audit_log`** mesmo quando falha por duplicidade (chamando `log_audit('cliente', codigo, 'tentativa_duplicada', {...})`) — facilita auditoria futura de "sumiços".

### Fora do escopo
- Investigar outros cadastros perdidos no passado.
- Mudanças nos demais cadastros (produtos, motoristas, etc.).

### Resultado esperado
- 33996 e 33995 reaparecem no banco.
- Próximas tentativas falhas ficam visíveis (alerta no dialog + entrada no audit_log) e o dialog não fecha sem salvar.

