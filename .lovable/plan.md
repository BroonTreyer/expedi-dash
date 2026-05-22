## Diagnóstico

Os pedidos **não foram apagados**. Quando você cancelou a carga `CARLOS MARABA` (registrada às 20:37), os 2 itens (CALABRESA + MORTADELA, cliente RS DISTRIBUIDORA, pedido #173) voltaram corretamente para Vendas — porém com `data = 23/05/2026` (que era a data planejada da carga).

A tela de Vendas (Index) hoje tem o filtro padrão fixado em **hoje (22/05)**, então pedidos para 23/05 ficam invisíveis até você mudar o filtro de data. Por isso "sumiu".

## Solução proposta

Ajustar o cancelamento para deixar os pedidos imediatamente visíveis no painel de hoje, sem o usuário ter que mexer no filtro de data:

- Em `src/components/portaria/CancelarCargaDialog.tsx`, no UPDATE que reverte as linhas para `etapa='vendas'`, **também reescrever `data = CURRENT_DATE` (hoje)**.
- A normalização defensiva que já existe (alinhar `data`/`cliente` por grupo de pedido) continua valendo — o novo `data` vira a referência uniforme do grupo, então não quebra agrupamento.
- A `data_carga` original fica preservada no registro de Ocorrência (já gravamos `data_carga: carga.data`), então o histórico não se perde.

Resultado: ao cancelar, os pedidos aparecem na hora no painel de Vendas do dia atual, prontos para serem refeitos.

## Sobre os pedidos do CARLOS MARABA já cancelados

Já estão lá com data 23/05. Posso, junto com a mudança, rodar um pequeno UPDATE de migração para mover esses 2 itens (`aed9a26c…` e `857c7620…`) para a data de hoje, ou você pode simplesmente trocar o filtro de data para 23/05 no painel para vê-los agora — me diga qual prefere ao aprovar.

## Arquivos afetados

- `src/components/portaria/CancelarCargaDialog.tsx` (1 ajuste no UPDATE de reversão)
- Memory: atualizar `mem/features/load-cancellation.md` registrando que o cancelamento reposiciona os pedidos para o dia atual.

Nenhuma mudança em RLS, edge functions ou schema.
