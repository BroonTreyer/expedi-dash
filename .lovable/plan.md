

# Atualizar Telefone do Motorista + Lacre Obrigatório na Saída

## Problema

1. Quando o motorista muda de telefone, não há como atualizar o cadastro a partir do autocomplete da portaria
2. Ao dar saída em qualquer veículo (não só carga própria), o número do lacre deveria ser obrigatório

## Solução

### 1. Atualizar telefone do motorista no autocomplete

No `MotoristaAutocomplete.tsx`, ao selecionar um motorista, exibir o telefone cadastrado e permitir editá-lo. Se o telefone for alterado, atualizar automaticamente na tabela `motoristas`.

- Após selecionar motorista, mostrar um campo de telefone editável abaixo do input
- Se o usuário mudar o telefone e sair do campo (onBlur), chamar `useUpdateMotorista` para atualizar o cadastro
- Exibir um toast de confirmação "Telefone atualizado"

**Alternativa mais simples**: No `onSelect` do `RegistroMovimentoDialog`, preencher o telefone no formulário. Se o usuário alterar manualmente, ao submeter o movimento, verificar se o telefone difere do cadastrado e oferecer atualização. Isso evita complexidade no autocomplete.

**Abordagem escolhida**: Adicionar no autocomplete um botão/link "Atualizar telefone" visível quando o motorista é selecionado, que abre um mini-input para editar e salvar o novo telefone direto no cadastro.

### 2. Lacre obrigatório na saída (todas as categorias com veículo)

No `VISIBILITY_SAIDA` em `portaria-fields-config.ts`, tornar `numero_lacre` obrigatório para as categorias que possuem veículo na saída.

Categorias afetadas:
- `carga_propria` — já é obrigatório ✅
- `terceirizado` — mudar de "oculto" para "obrigatório"
- `fornecedor` — mudar de "oculto" para "obrigatório"

Para terceirizados, o fluxo atual usa "saída rápida" (sem dialog). Precisamos mudar para abrir o dialog de saída com campo de lacre, em vez de confirmar direto.

**Mudanças no `PatioAtualTab.tsx`**: O botão "Saída" de terceirizados (etapa `no_patio`) precisa chamar `onRegistrarSaida(m)` em vez de usar saída rápida, para que o dialog com campo lacre apareça.

| Arquivo | Mudança |
|---|---|
| `src/lib/portaria-fields-config.ts` | `numero_lacre` obrigatório na saída para terceirizado e fornecedor |
| `src/components/portaria/PatioAtualTab.tsx` | Terceirizados `no_patio` usam `onRegistrarSaida` em vez de saída rápida |
| `src/components/portaria/MotoristaAutocomplete.tsx` | Adicionar opção de atualizar telefone ao selecionar motorista |
| `src/hooks/useMotoristas.ts` | Sem mudança (já tem `useUpdateMotorista`) |

