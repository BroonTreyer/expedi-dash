

# Autocomplete de Motorista no Fechamento de Carga

## Problema

No `FechamentoLoteDialog`, o campo "Motorista" é um `<Input>` de texto livre. Quando a carga é fechada, esse nome vai para `veiculos_esperados`, mas o motorista pode não estar cadastrado na tabela `motoristas`. Não há como cadastrá-lo nesse momento.

## Solução

Substituir o `<Input>` do campo motorista no `FechamentoLoteDialog` pelo componente `MotoristaAutocomplete` (já existente), que permite buscar motoristas cadastrados e, caso não encontre, abrir o mini-dialog de cadastro rápido.

### Mudanças

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
1. Importar `MotoristaAutocomplete` de `@/components/portaria/MotoristaAutocomplete`
2. Substituir o `<Input value={motorista} onChange={...} />` pelo `<MotoristaAutocomplete value={motorista} onChange={setMotorista} />`
3. Remover o `<Label>` inline se necessário (o autocomplete já exibe o nome)

Nenhuma outra alteração necessária -- o componente já suporta busca por nome/CPF, cadastro rápido e atualização de telefone.

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Trocar `<Input>` do motorista por `<MotoristaAutocomplete>` |

