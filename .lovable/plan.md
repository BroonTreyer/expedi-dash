

# Adicionar Hide/Show no Menu Lateral

## Solução
Adicionar um estado `collapsed` no `Layout.tsx` com um botão toggle visível no header do conteúdo (desktop). Quando colapsado, o sidebar mostra apenas os ícones (largura ~56px). No mobile, mantém o comportamento atual.

### `Layout.tsx`
- Adicionar estado `collapsed` (default `false`)
- Passar `collapsed` para `AppSidebar`
- Adicionar header com botão toggle visível em desktop (sempre visível)

### `AppSidebar.tsx`
- Receber prop `collapsed`
- Quando colapsado: `w-14` ao invés de `w-60`, esconder textos, mostrar apenas ícones
- Esconder logo texto, email, role — manter apenas ícone do logo e ícones de nav
- Tooltip nos ícones quando colapsado (opcional, pode ser fase 2)

## Arquivos (2)
1. `src/components/Layout.tsx`
2. `src/components/AppSidebar.tsx`

