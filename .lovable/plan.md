## Plano de correção

Vou tratar a ordem de entrega como dado crítico e preservar exatamente a sequência visual escolhida pelo usuário.

### 1. Corrigir a origem da ordem na Roteirização
- Ao abrir o `RoteirizacaoDialog`, ordenar os itens/grupos pela `ordem_entrega` já salva antes de montar a lista.
- Ao avançar da roteirização para “Fechar Carga” ou para edição de pré-carga, garantir que os grupos enviados estejam renumerados pela posição visual atual, não por estado antigo.
- Ajustar o identificador do drag-and-drop para não colidir quando há mais de um cliente sem código ou múltiplos grupos parecidos.

### 2. Impedir que recálculos automáticos sobrescrevam a ordem manual
- Separar claramente dois modos:
  - `Roteirizar/Otimizar`: pode sugerir nova ordem.
  - `Arrastar/manual`: apenas recalcula km/linha mantendo a ordem exata escolhida.
- Garantir que respostas atrasadas da função de rota não reordenem a lista depois que o usuário já mexeu manualmente.

### 3. Salvar no banco exatamente a ordem visual final
- No `FechamentoLoteDialog`, gerar `ordem_entrega` somente pela posição atual do array visual (`1, 2, 3...`).
- Aplicar isso igualmente em:
  - salvar pré-carga;
  - editar pré-carga;
  - finalizar pré-carga;
  - fechar carga direto.
- Antes de enviar o lote, renumerar os grupos novamente para eliminar qualquer `group.ordem` defasado.

### 4. Melhorar a reabertura/visualização
- Ao reabrir pré-carga ou carga já montada, reconstruir os grupos usando a menor `ordem_entrega` do grupo e não a ordem de criação/retorno do banco.
- Isso evita a impressão de que “salvou diferente” quando o banco está certo mas a tela remonta errado.

### 5. Validação prática
- Conferir que o payload enviado ao batch update contém sequência contínua e coerente.
- Validar os fluxos principais:
  - selecionar pedidos → roteirizar → arrastar → fechar carga;
  - selecionar pedidos → salvar pré-carga → editar → arrastar → salvar;
  - pré-carga → roteirizar → ajustar manualmente → finalizar.

## Arquivos previstos
- `src/components/dashboard/RoteirizacaoDialog.tsx`
- `src/components/dashboard/FechamentoLoteDialog.tsx`
- `src/pages/Index.tsx` se precisar ajustar passagem/limpeza do resultado de roteirização.

Não pretendo mudar schema nem permissões do banco; a correção é no fluxo de montagem, preservação e gravação da ordem.