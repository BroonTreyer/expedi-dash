

# Adicionar Máscaras de CPF e Telefone

## Problema
Os campos CPF e Telefone são exibidos e digitados sem formatação. O usuário quer máscaras: `000.000.000-00` para CPF e `(00) 00000-0000` para Telefone.

## Solução

Criar funções utilitárias de máscara e aplicá-las nos inputs e na exibição.

### 1. `src/lib/masks.ts` (novo)
- `maskCPF(value)` — formata para `000.000.000-00`
- `maskPhone(value)` — formata para `(00) 00000-0000`

### 2. Aplicar nos formulários de entrada
- `src/pages/Motoristas.tsx` — campos CPF e Telefone no `MotoristaFormDialog` + exibição na tabela/cards
- `src/components/portaria/MotoristaAutocomplete.tsx` — campo CPF no `CadastroRapidoDialog` + exibição nas sugestões

### 3. Aplicar na exibição
- Tabela/cards de motoristas: formatar CPF e Telefone ao exibir
- Dropdown do autocomplete: formatar CPF e Telefone nas sugestões

| Arquivo | Mudança |
|---|---|
| `src/lib/masks.ts` | Criar funções `maskCPF` e `maskPhone` |
| `src/pages/Motoristas.tsx` | Aplicar máscaras nos inputs e na exibição |
| `src/components/portaria/MotoristaAutocomplete.tsx` | Aplicar máscaras nos inputs e nas sugestões |

