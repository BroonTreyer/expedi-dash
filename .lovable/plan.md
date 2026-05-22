## Diagnóstico

A carga **CARLOS MARABA** (data 23/05, placa TWD5I87, transportadora Fob) está no banco, em `etapa=logistica` e `status=Pronto para carregar` — ou seja, foi fechada corretamente. Ela **deveria** aparecer no painel azul "Cargas fechadas aguardando veículo" em `/portaria/terceirizado`, mas sumiu.

**Causa:** o `carga_id` "CARLOS MARABA" foi reutilizado. Existem movimentações antigas dessa mesma chave (com a mesma placa TWD5I87) de 04/05:
- 1 `entrada` com `etapa_terceirizado=finalizado` + `horario_saida_final` preenchido
- 1 `saida`

No hook `useCargasFechadasAguardando` (`src/hooks/useCarregamentos.ts`), o bloco `isFinalizer` (linhas 601–613) e o bloco `jaNoPatio` (618–630) marcam a chave como finalizada **ignorando a janela de data** — isso foi feito de propósito para cargas planejadas com data antiga e expedidas dias depois. Mas o efeito colateral é que, quando o mesmo `carga_id` + placa é reaproveitado numa nova viagem (caso de cargas/motoristas recorrentes), as movimentações da viagem anterior continuam "finalizando" a nova carga e ela desaparece do painel.

Resultado: a carga nova de hoje (23/05) é silenciosamente escondida pelos movimentos de 19 dias atrás. Sem aparecer no painel, não há botão "Cancelar carga".

## Plano

### 1. Corrigir o hook `useCargasFechadasAguardando`
Arquivo: `src/hooks/useCarregamentos.ts` (blocos `isFinalizer` e `jaNoPatio` em ~linhas 595–630).

Adicionar guarda: um movimento só finaliza/oculta a chave se sua `data_hora` for **compatível com o ciclo atual da carga** — ou seja, não pode ser de um ciclo anterior. Regra:

- Se `m.data_hora` < `cargaData - 2 dias` → o movimento é de um ciclo antigo, **ignora** (não finaliza, não marca como "no pátio").
- Mantém o comportamento atual de não exigir janela superior (carga planejada para o passado mas expedida depois continua funcionando).

Isso resolve exatamente o caso CARLOS MARABA (movimentos de 04/05 não podem finalizar uma carga planejada para 23/05).

### 2. Validação
- Recarregar `/portaria/terceirizado` — a carga CARLOS MARABA volta a aparecer no painel azul.
- Usuário consegue clicar em "Cancelar carga" e usar o fluxo já existente (`CancelarCargaDialog`).
- Verificar que cargas finalizadas dentro do ciclo atual continuam sumindo do painel (regressão).

### Escopo
- Apenas frontend, alteração lógica no hook.
- Sem mudanças em DB, RLS, edge functions.
- Sem mexer no fluxo de cancelamento (já funciona, só está inacessível hoje).

### Fora de escopo
- Bloquear reutilização de `carga_id` (mudança maior, fica para outra rodada).
- Limpar manualmente os movimentos antigos do banco — não é necessário, a correção do filtro já basta.
