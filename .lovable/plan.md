## Diagnóstico

Quando o usuário clica em **"Registrar Chegada"** num veículo da lista **Esperados** dentro de `/portaria/carga-propria`, o handler `openRegistroFromVeiculoEsperado` (em `src/pages/Portaria.tsx`) faz duas coisas em sequência:

1. `createMov.mutateAsync(...)` — cria a movimentação Carga Própria com `etapa_carga_propria='chegou'`, `horario_entrada=now()`.
2. `marcarConferidoMutation.mutateAsync(...)` — marca o `veiculos_esperados` como `conferido=true`.

**Verifiquei no banco** que para os motoristas que "não aparecem" (ALEX/MFM8075, WILMAR/RBY2D00, ILDEMIR/REK7D83, REYLLER/JHU6H31, FABRICIO/DKO0H12, etc.), **não existe nenhuma movimentação criada hoje** — eles continuam com `conferido=false` na tabela `veiculos_esperados`. Ou seja: o clique falhou silenciosamente OU criou a movimentação mas a lista do Pátio não invalidou a tempo.

Para JADERSON/PQO8358 (que "apareceu") existem **duas** movimentações criadas em sequência (10:51:55 e 10:52:27) — sintoma clássico de "cliquei, não apareceu, cliquei de novo".

### Causas prováveis

1. **Sem feedback de erro visível**: se `createMov` falha (RLS, validação de trigger, rede), o `toast.error` mostra a mensagem mas o item continua na lista de esperados como se nada tivesse acontecido.
2. **`marcarConferidoMutation` invalida apenas `["veiculos_esperados"]`** — não invalida `["movimentacoes_portaria_ativas_patio"]`. O `createMov` faz a invalidação correta, mas a ordem assíncrona pode causar a lista do pátio não atualizar imediatamente em alguns cenários.
3. **`marcarConferido` por `(placa, data_referencia)`** — se houver mais de uma linha de esperado com a mesma placa, todas viram `conferido=true`. Em casos raros isso pode esconder algo da UI sem que o pátio mostre o registro.
4. **Não há proteção contra clique duplo** no botão "Registrar Chegada" — explica os duplicados de PQO8358.

## Plano

### 1. `src/pages/Portaria.tsx` — handler `openRegistroFromVeiculoEsperado`

- **Bloquear clique duplo**: usar um `Set<string>` em `useState` com IDs em processamento; ignorar cliques enquanto o veículo já está sendo registrado.
- **Tornar erro visível e específico**: capturar exceção do `createMov` e exibir `toast.error` com a mensagem real do Postgres (RLS/trigger/validação). Hoje só mostra mensagem genérica.
- **Invalidar a query do Pátio explicitamente após sucesso**: `queryClient.invalidateQueries({ queryKey: ["movimentacoes_portaria_ativas_patio"] })` e `["movimentacoes_portaria"]`. Garantir que a UI reflete imediatamente.
- **Marcar conferido por `id` em vez de `(placa, data_referencia)`**: mais preciso, evita atualizar irmãos de outras datas.

### 2. `src/components/portaria/VeiculosEsperadosPanel.tsx`

- Adicionar prop `pendingIds?: Set<string>` (vinda do Portaria).
- No botão "Registrar Chegada" (mobile e desktop), aplicar `disabled` e ícone `Loader2` quando o ID estiver em processamento.

### 3. `src/hooks/useVeiculosEsperados.ts` — `useMarcarConferido`

- Adicionar overload aceitando `{ id }` em vez de `(placa, dataReferencia)` para escopo preciso.
- Manter assinatura antiga para compatibilidade.
- Invalidar também `["movimentacoes_portaria_ativas_patio"]` no `onSuccess`.

### 4. Verificação pós-deploy

Após o fix, pedir ao usuário para reproduzir com um motorista que não aparece. Se o `createMov` falhar, o toast vai mostrar exatamente qual a causa (provavelmente uma trigger ou RLS), e aí faremos o fix-up apropriado.

## Critério de aceitação

- Clique em "Registrar Chegada" mostra spinner e desabilita o botão até concluir.
- Em caso de falha, aparece toast vermelho com a mensagem de erro real.
- Em caso de sucesso, o veículo desaparece de "Esperados" **e** aparece imediatamente em "Pátio Atual" com badge "Chegou".
- Não é mais possível criar duplicatas com cliques rápidos.
