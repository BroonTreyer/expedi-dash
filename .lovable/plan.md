

# Autocomplete de Motorista no Cadastro da Portaria

## Problema

O campo "Motorista" no formulário de registro da Portaria é um input de texto livre. O usuário quer buscar motoristas cadastrados na tabela `motoristas` diretamente nesse campo, com autocomplete por nome.

## Solução

Substituir o `<Input>` do campo `motorista` no `RegistroMovimentoDialog.tsx` por um componente de autocomplete que:

1. Busca motoristas da tabela `motoristas` conforme o usuário digita (usando `useMotoristas(searchTerm)`)
2. Exibe uma lista dropdown com os nomes encontrados
3. Ao selecionar, preenche o campo motorista com o nome completo
4. Permite também digitar um nome manualmente (caso o motorista não esteja cadastrado)

### Implementação

**`src/components/portaria/RegistroMovimentoDialog.tsx`**:
- Importar `useMotoristas` 
- No render do campo `motorista` (quando `field.key === "motorista"`), renderizar um componente customizado com:
  - Input com debounce de 300ms para busca
  - Popover/dropdown com resultados da busca (nome + telefone)
  - Ao clicar num resultado, preencher `motorista` com `nome_completo`
- Usar o componente `Command` (shadcn) ou um simples dropdown com lista filtrada

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Adicionar autocomplete no campo `motorista` usando dados da tabela `motoristas` |

