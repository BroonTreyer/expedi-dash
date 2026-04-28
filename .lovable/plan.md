## O que muda

Você não precisará mais informar/selecionar o motivo ao marcar uma ruptura. Vou remover o campo dos formulários e a obrigatoriedade no salvamento. Dados antigos com motivo continuam no banco, mas não aparecerão mais nas telas (assim a tela fica limpa e consistente com a nova regra).

## Arquivos a alterar

1. **`src/components/dashboard/CarregamentoDialog.tsx`**
   - Remover a validação que bloqueia salvar quando há ruptura sem motivo (linhas ~290–294).
   - Remover qualquer input de `motivo_ruptura` no formulário (se houver) e parar de enviar o campo no payload (passa a ser sempre `null`).

2. **`src/components/dashboard/EditarCargaDialog.tsx`**
   - Remover o input de `motivo_ruptura` por item (linhas ~189–195) e o estado/coluna correspondente. Manter apenas a edição de peso.

3. **`src/components/aprovacoes/EditarPedidoAprovacaoDialog.tsx`**
   - Remover o `Select` de motivo (linhas ~321–330) e parar de setar `motivo_ruptura: "estoque"` ao marcar a checkbox de ruptura. Continuar enviando `motivo_ruptura: null` para o backend.

4. **`src/components/dashboard/ImportarPedidoPdfDialog.tsx`**
   - Remover o input de motivo na grid de itens (linhas ~503–504) e o campo `motivo_ruptura` do estado local. No payload final, sempre enviar `null`.

5. **`src/hooks/useEditarPedidoAprovacao.ts`**
   - Manter o campo no schema da interface por compatibilidade, mas sempre persistir `null`. (Sem migração de banco.)

## Telas de leitura (limpeza visual)

Para não exibir mais "Motivo:" em lugar nenhum:

6. **`src/components/vendedor/RupturasVendedor.tsx`** — remover o bloco `{r.motivo_ruptura && …}`.
7. **`src/pages/Rupturas.tsx`** — remover:
   - Card/seção "Motivos de ruptura" (linha ~982).
   - Colunas/linhas que mostram `motivo_ruptura` na lista e na tabela (linhas ~837–838 e ~902–904).
   - Coluna "Motivo" nos exports CSV (linhas ~547 e ~586).
   - Entrada de timeline de auditoria que cita motivo (linhas ~1328–1330).
8. **`src/components/dashboard/RupturasPrintDialog.tsx`** — remover a coluna "Motivo" da tabela de impressão (cabeçalho + célula linha ~195).

## O que NÃO muda

- A coluna `motivo_ruptura` no banco permanece (sem migração). Registros históricos ficam preservados, apenas deixam de ser exibidos.
- A marcação de ruptura (checkbox/flag `ruptura` e `ruptura_sinalizada`) continua funcionando normalmente.
- KPIs, contagens e relatórios de rupturas continuam iguais — só o campo "motivo" some da UI.

## Confirmação

Se preferir **manter o campo visível como opcional** (sem obrigatoriedade) em vez de remover de toda a UI, me avise antes de aprovar — é uma alteração bem menor (só removo a validação do passo 1).