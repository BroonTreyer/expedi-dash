

# Remover Contorno Vermelho do StatusSelect

## Problema
Ao clicar/focar no seletor de status, aparece um contorno vermelho (focus ring) porque a variável `--ring` usa a cor primária vermelha.

## Solução

### `StatusSelect.tsx`
- Adicionar `focus:ring-0 focus:ring-offset-0` ao `SelectTrigger` para desabilitar o ring de foco.

## Arquivos (1)
1. `src/components/dashboard/StatusSelect.tsx`

