
## Problema

`RegistroMovimentoDialog.tsx` linha 38: um componente funcional (`CapturaFoto` ou outro) está sendo passado como filho direto de um componente Radix UI (`Dialog`, `DialogTrigger` ou similar) que tenta passar uma `ref` para ele. Como o componente filho não usa `forwardRef`, o React emite o warning.

## Diagnóstico

Preciso ler mais do arquivo para identificar a linha exata onde isso ocorre.

### Arquivo a corrigir

**`src/components/portaria/RegistroMovimentoDialog.tsx`**

A correção é envolver o componente funcional problemático com `React.forwardRef`, ou substituir pelo padrão já usado em `AppSidebar.tsx` (usando `<button>` nativo em vez do componente de botão/trigger quando o ref não é necessário).

O warning aponta linha 38 (`RegistroMovimentoDialog`) e depois linha 34 (`Dialog` → `RegistroMovimentoDialog`), ou seja: ou `RegistroMovimentoDialog` em si não usa `forwardRef` e está sendo usado com `ref` em `Portaria.tsx`, ou algum componente filho dentro do dialog está sendo passado como `asChild` sem `forwardRef`.

## O que mudar

1. Ler `RegistroMovimentoDialog.tsx` completo para identificar o componente sem `forwardRef`
2. Envolver o componente ofensor com `React.forwardRef` ou corrigir o uso de `asChild`
3. Verificar `Portaria.tsx` para confirmar se `RegistroMovimentoDialog` é usado com `ref`

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Identificar e corrigir o componente funcional sem forwardRef usado como filho de Radix trigger/dialog |
| `src/pages/Portaria.tsx` | Verificar se há `ref` sendo passado ao componente |
