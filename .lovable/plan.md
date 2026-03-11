

# Corrigir Logo no Menu Colapsado

## Problema
A logo Frico (que é horizontal/retangular) fica espremida dentro do sidebar de 56px quando colapsado, ficando distorcida.

## Solução

### `AppSidebar.tsx`
- Quando colapsado, reduzir o padding do container da logo (`p-5` → `p-2`) e diminuir a altura da imagem (`h-9` → `h-7`)
- Garantir que a imagem fique centralizada e com `object-contain`

## Arquivos (1)
1. `src/components/AppSidebar.tsx`

