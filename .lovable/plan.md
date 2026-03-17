

# Adicionar campo "Transportadora" no dialog Fechar Carga

O dialog `FechamentoLoteDialog.tsx` atualmente tem 4 campos: Tipo Caminhão, Placa, Motorista e Horário Previsto. Falta o campo **Transportadora**, que já existe na tabela `carregamentos_dia` (coluna `transportadora`).

## Alterações

### `src/components/dashboard/FechamentoLoteDialog.tsx`
1. Adicionar estado `transportadora` (string)
2. Adicionar campo Input "Transportadora" no grid de formulário (entre Motorista e Horário Previsto, ou como 5º campo)
3. Incluir `transportadora` no objeto de `updates` enviado ao `onSubmit`
4. Incluir `transportadora` no payload do `onPrintReady` (para aparecer no romaneio impresso)
5. Resetar o campo no `useEffect` quando o dialog abre

### `src/components/dashboard/FechamentoLoteDialog.tsx` (Props/interface)
- Atualizar o tipo do `onSubmit` para incluir `transportadora: string` nos updates

### `src/components/dashboard/CargaPrintDialog.tsx`
- Exibir a transportadora no cabeçalho do romaneio impresso (se disponível)

### Caller (Index.tsx ou quem chama o dialog)
- Passar o campo `transportadora` no handler de submit para salvar no banco

