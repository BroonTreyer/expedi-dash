
User wants "Apagar carga" to actually **unmake** the load — i.e., return the orders back to the "vendas" stage (so they can be re-grouped into a new load), instead of permanently deleting the orders. This matches their earlier loss event (EDIVAR) and is much safer.

## Plano: Trocar "Apagar carga" por "Desfazer carga"

### Comportamento novo

Em vez de `DELETE` dos 23 pedidos, o botão fará um `UPDATE` em todos os pedidos da carga, limpando os dados logísticos e voltando para a etapa "vendas":

```sql
UPDATE carregamentos_dia
SET etapa = 'vendas',
    status = 'Aguardando',
    carga_id = NULL,
    nome_carga = NULL,
    placa = NULL,
    motorista = NULL,
    tipo_caminhao = NULL,
    transportadora = NULL,
    ordem_entrega = NULL,
    horario_inicio = NULL,
    horario_fim = NULL
WHERE carga_id = '<cargaId>'
```

Os pedidos preservam: produto, quantidade, peso, cliente, ruptura, observações, vendedor, data — tudo que veio de Vendas.

### UI (EditarCargaDialog)

- Renomear botão: **"Desfazer carga (N pedidos voltam para Vendas)"**
- Ícone: trocar `Trash2` por `Undo2` (lucide)
- Variant: trocar `destructive` por `outline` (não é mais ação destrutiva)
- Confirmação: manter `DeleteConfirmDialog` mas **sem exigir digitar o nome** — basta confirmar. Mensagem nova:
  > "Os N pedidos da carga "X" voltarão para a etapa Vendas e poderão ser agrupados em uma nova carga. Nenhum dado de produto/cliente será perdido."
- Renomear prop `onDeleteCarga` → `onDesfazerCarga` (ou manter nome para reduzir diff e só mudar comportamento)
- Toast sucesso: "Carga desfeita — N pedidos voltaram para Vendas"

### Consolidado.tsx

- Substituir a chamada que faz `DELETE` em massa (`deleteCargaMut`) por uma mutation `desfazerCargaMut` que executa o UPDATE em batch via Supabase.
- Após sucesso: invalidar queries `consolidado` e `carregamentos`, fechar diálogo.

### O que acontece com a possibilidade real de apagar pedidos?

Permanece disponível, mas item a item: o ícone **X** ao lado de cada pedido na lista do diálogo continua removendo o pedido individualmente da carga (também via update voltando para vendas — comportamento já existente). Não há mais botão para deletar pedidos em massa pelo diálogo. Para deletar de verdade, o usuário usa a ação de exclusão individual já disponível na tabela do painel.

### Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Consolidado.tsx` | Substituir `deleteCargaMut` por `desfazerCargaMut` (UPDATE em vez de DELETE); novo toast |
| `src/components/dashboard/EditarCargaDialog.tsx` | Renomear botão, trocar ícone/variant, atualizar texto da confirmação, remover `confirmText` obrigatório |

### Resultado

Cliques acidentais não causam mais perda de dados — no pior caso, basta refazer o fechamento da carga com os mesmos pedidos.
