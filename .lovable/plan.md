## Diagnóstico da auditoria

- O backend está respondendo normalmente.
- O SEIKOMAR está duplicado em dois lugares:
  - **Pré-carga antiga:** `PRE-20260522-161438-GP5`, com 7 linhas, 2 pedidos, `etapa = pre_carga`, peso total **35.718 kg**.
  - **Pedidos novos disponíveis no painel:** pedidos **167** e **168**, com 7 linhas, `etapa = vendas`, peso total **35.650 kg**.
- Esses pedidos novos foram criados hoje por `faturamento@frico.ind.br` às 12:47, depois da pré-carga original, por isso aparecem disponíveis no painel mesmo já existindo uma pré-carga do SEIKOMAR.
- Não há registro de finalização da pré-carga SEIKOMAR hoje: nenhum log mudou `etapa` de `pre_carga` para `logistica`, e não há previsão atual na portaria para o SEIKOMAR/Carlos Alberto.
- Há um problema de fluxo: o botão de salvar/editar pré-carga ainda fecha o diálogo antes de confirmar o banco, e alguns caminhos usam `mutate` sem aguardar confirmação. Isso permite a sensação de “imprimiu/finalizou”, mas nada persistiu se houve falha ou ação incompleta.

## Plano de correção

1. **Corrigir o estado atual do SEIKOMAR no banco**
   - Manter apenas um conjunto operacional ativo para SEIKOMAR.
   - Como a pré-carga antiga já existe e representa a reserva, vou voltar os pedidos novos duplicados **167/168** para uma situação fora do painel operacional ou vinculá-los corretamente conforme a regra segura escolhida na implementação.
   - Preservar rastreabilidade: não apagar dados sem necessidade; se for necessário limpar duplicidade, registrar de forma reversível/segura.

2. **Finalizar corretamente a pré-carga SEIKOMAR**
   - Atualizar as 7 linhas da pré-carga `PRE-20260522-161438-GP5` para carga real (`etapa = logistica`) com `carga_id` único no padrão `CG-...`, mantendo `nome_carga = SEIKOMAR`.
   - Aplicar motorista/placa/transportadora/tipo de caminhão a partir do fechamento informado para que apareça na portaria.
   - Criar/garantir a previsão em `veiculos_esperados` para a portaria, sem duplicar veículo se já existir.

3. **Blindar o fluxo no código**
   - Em `Index.tsx`, trocar os salvamentos de pré-carga e adicionar-à-carga que ainda usam `mutate` por `mutateAsync` com `await`, toast de sucesso somente após confirmação e erro visível se falhar.
   - Em `FechamentoLoteDialog.tsx`, fazer o botão “Salvar pré-carga” aguardar `onSavePreCarga` antes de fechar o diálogo, igual ao “Finalizar Carga”.
   - Impedir impressão/fechamento visual antes da confirmação real do banco.

4. **Adicionar proteção contra duplicidade operacional**
   - Antes de criar/adicionar pedidos a uma pré-carga ou fechar carga, detectar se o mesmo cliente/produtos/pesos já estão em uma pré-carga ativa para a mesma janela operacional.
   - Mostrar erro claro em vez de deixar o mesmo SEIKOMAR aparecer como pré-carga e também como pedido disponível.

5. **Validação final**
   - Reconsultar o banco para confirmar:
     - SEIKOMAR não aparece duplicado em `pre_carga` e `vendas`.
     - A carga real aparece em `logistica` com motorista/veículo.
     - A portaria tem veículo esperado vinculado à carga.
   - Validar que o painel deixa de mostrar os pedidos duplicados disponíveis.