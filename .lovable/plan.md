Vou corrigir isso em duas frentes, porque o problema não é só “não atualizar”: a linha já foi salva no banco com `peso = 2000`, mas a aba `Faltando agora` continua calculando o faltante por `peso_original` quando `ruptura = true`. Por isso ela mostra 40.000 kg em vez dos 2.000 kg que estão agora na tela/pedido.

Plano de correção:

1. Ajustar o cálculo da aba `Faltando agora`
   - Para ruptura total (`ruptura = true`), a aba passará a somar exatamente o `peso` atual da linha.
   - Exemplo do print: produto 400 com `peso = 2000` passará a aparecer como `2.000 kg`, não `40.000 kg`.
   - Manterei o histórico do mês separado: ele pode continuar usando a lógica de perda histórica quando fizer sentido, sem contaminar o “agora”.

2. Corrigir a quantidade exibida em produtos por unidade
   - Hoje o código de `Faltando agora` também usa `quantidade_original` para ruptura total, o que pode deixar quantidade velha depois de edição.
   - Vou trocar para usar a `quantidade` atual quando `ruptura = true`, igual ao peso atual.

3. Fazer a atualização aparecer imediatamente após edição
   - No hook `useCarregamentos`, após editar ou editar em lote, vou disparar refetch real das queries de `carregamentos`, em vez de apenas marcar como stale.
   - Isso evita depender só do Realtime/polling e corrige o caso em que o usuário salva em uma tela e a aba de ruptura fica com cache antigo.

4. Reduzir a janela de inconsistência no Realtime
   - No evento `UPDATE` recebido em tempo real, além de mesclar a linha no cache, vou invalidar/refetchar as queries relevantes de `carregamentos` de forma controlada.
   - Assim, se algum trigger do banco alterar `peso_original`, `ruptura_sinalizada`, `updated_at` ou campos derivados depois do update, a tela busca a versão final do banco.

5. Verificar o item do exemplo
   - Vou validar especificamente o caso do produto 400 / “LINGUICA DE CARNE SUINA...” para garantir que `Faltando agora` passe a refletir 2.000 kg.

Arquivos previstos:

- `src/pages/Rupturas.tsx`
- `src/hooks/useCarregamentos.ts`

Observação importante: pelo dado atual no banco, o registro do exemplo está com `peso = 2000` e `peso_original = 40000`. Então a tela estava “atualizada”, mas usando a base errada para o cálculo de ruptura total. A correção principal é fazer `Faltando agora` usar o peso atual, como você pediu.