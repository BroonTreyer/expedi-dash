

# Cadastro Rápido de Motorista + Campo CPF

## Problema

1. Quando o motorista não está cadastrado, o usuário precisa sair do formulário e ir à página de Motoristas para cadastrá-lo
2. Não existe campo CPF no cadastro de motoristas
3. A busca/autocomplete não mostra CPF

## Solução

### 1. Migration — adicionar coluna `cpf` na tabela `motoristas`

```sql
ALTER TABLE motoristas ADD COLUMN cpf text;
```

### 2. `src/hooks/useMotoristas.ts`

- Adicionar `cpf: string | null` na interface `Motorista`
- No `useCreateMotorista` e `useUpdateMotorista`, incluir `cpf` nos inputs
- Na query de busca, buscar também por CPF: `.or(`nome_completo.ilike.%${search}%,cpf.ilike.%${search}%`)`

### 3. `src/components/portaria/MotoristaAutocomplete.tsx`

- Expandir interface Props: adicionar `onSelect?: (motorista: { nome_completo: string; telefone?: string; cpf?: string }) => void`
- Ao selecionar, chamar `onSelect` com dados completos do motorista
- Mostrar CPF na lista de sugestões (junto com telefone)
- Quando não houver resultados e query >= 2 chars, exibir botão **"+ Cadastrar motorista"**
- Ao clicar, abrir mini-dialog inline de cadastro rápido (nome, CPF, telefone, foto documento)
- Após cadastro, selecionar automaticamente o motorista criado

### 4. `src/components/portaria/RegistroMovimentoDialog.tsx`

- No bloco do campo `motorista`, usar `onSelect` para preencher telefone automaticamente no formulário (`set("telefone", motorista.telefone)`)

### 5. `src/pages/Motoristas.tsx`

- Adicionar campo CPF no `MotoristaFormDialog`
- Exibir coluna CPF na tabela

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `cpf` em `motoristas` |
| `src/hooks/useMotoristas.ts` | CPF na interface, busca por CPF, incluir CPF no CRUD |
| `src/components/portaria/MotoristaAutocomplete.tsx` | Mostrar CPF, botão cadastro rápido com mini-dialog, callback `onSelect` |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Usar `onSelect` para preencher telefone |
| `src/pages/Motoristas.tsx` | Campo CPF no form e coluna na tabela |

