# Corrigir geração em volume da OC 133197

## Diagnóstico confirmado

- A OC 133197 possui **27 CT-es**, totalizando **R$ 40.564,98** e **21.842,7 kg**.
- Entre eles, **10 CT-es diferentes têm legitimamente o mesmo frete de R$ 91,80** (1548 e 1550–1558).
- O modo padrão **Individual** executa uma criação por CT-e. A trava por OC compara somente OC + transportadora + valor; depois do primeiro CT-e de R$ 91,80, o próximo é interpretado incorretamente como duplicado.
- A função atual é atômica apenas para **um adiantamento**. A operação completa de 27 itens continua sendo uma sequência de chamadas, portanto ainda pode parar no meio e deixar uma geração parcial.
- A nova tentativa não criou adiantamentos ativos nem novos órfãos; permanecem apenas os cinco registros antigos já cancelados.

## Correção

### 1. Remover o falso positivo por valor repetido
- Eliminar a validação por “mesma OC + mesmo valor” do fluxo individual.
- Considerar duplicidade real pela identidade do CT-e (`cte_id`), que já é validada no banco, permitindo que CT-es distintos tenham valores iguais.

### 2. Tornar toda a geração atômica
- Criar uma função de geração em lote que receba todos os grupos selecionados, valide todos os CT-es antes de gravar e crie cabeçalhos + vínculos em uma única transação.
- Se qualquer um dos 27 itens falhar, nenhum adiantamento será criado.
- Proteger também contra duas gerações simultâneas do mesmo CT-e no banco.

### 3. Ajustar o fluxo da tela
- Enviar uma única requisição para a operação completa, tanto no modo Individual quanto no modo Lote.
- Manter a seleção quando houver erro e mostrar a causa exata, sem exigir que o usuário selecione tudo novamente.
- Durante o processamento, bloquear novo clique e exibir progresso adequado para a quantidade selecionada.

### 4. Validar a OC 133197
- Testar a geração com os 27 CT-es, incluindo os 10 valores iguais de R$ 91,80.
- Conferir que o modo Individual cria 27 adiantamentos com 27 vínculos e que o modo Lote cria um cabeçalho com 27 vínculos.
- Confirmar totais, ausência de órfãos e bloqueio de uma segunda tentativa com os mesmos CT-es.

## Detalhes técnicos

- Backend: nova RPC em lote, com validação de roles, bloqueio transacional dos CT-es e retorno de todos os cabeçalhos criados.
- Frontend: `useAdiantamentos.ts` fará uma chamada por operação; `AdiantamentosTab.tsx` montará o lote completo e tratará sucesso/erro uma única vez.
- A validação de duplicidade por `cte_id` ficará como regra definitiva; valores iguais entre documentos diferentes não serão mais considerados duplicidade.
