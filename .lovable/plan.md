
User wants the sidebar to have a single "Portaria" parent menu item that expands to reveal:
- Carga Própria
- Terceirizados
- Cadastros (which itself groups Motoristas + Caminhões + Tipos de Caminhão)

Currently these are flat items. I'll use a collapsible group pattern in `AppSidebar.tsx`.

## Plano

### Reorganização do menu lateral

Agrupar itens relacionados à Portaria em um único item expansível chamado **"Portaria"**, que ao ser clicado abre os subitens.

**Nova estrutura proposta:**

```text
Painel
Consolidado
Rupturas
Analytics
Relatórios
Produtos
Vendedores
Clientes
▾ Portaria                    ← NOVO (expansível)
   • Carga Própria
   • Terceirizados
   • Cadastros              ← sub-grupo
      ◦ Motoristas
      ◦ Caminhões
      ◦ Tipos de Caminhão
Usuários
Backups
```

### Implementação (1 arquivo)

**`src/components/AppSidebar.tsx`**
- Substituir a lista plana `allNavItems` por uma estrutura hierárquica suportando `children`.
- Usar `Collapsible` (já existe em `src/components/ui/collapsible.tsx`) para o grupo "Portaria" e o sub-grupo "Cadastros".
- Adicionar ícone `ChevronDown` que rotaciona quando aberto.
- Auto-expandir o grupo se a rota ativa pertencer a ele (usando `location.pathname`).
- No modo colapsado (sidebar w-14): mostrar apenas o ícone "Portaria" e abrir os subitens via Tooltip+Popover (ou simplesmente manter expansível clicável).
- Manter filtro por `role` por item e por grupo (grupo só aparece se tiver pelo menos 1 filho permitido).
- Indentação visual dos subitens (`pl-9` para nível 2, `pl-12` para nível 3).

### Comportamento
- Estado de expansão controlado por `useState`, inicializado como aberto se a rota atual estiver dentro do grupo.
- Sem mudanças em rotas, permissões ou páginas — apenas reorganização visual no sidebar.

### Detalhes técnicos
- Roles preservadas exatamente como hoje:
  - Carga Própria / Terceirizados / Motoristas: `admin, logistica, portaria`
  - Caminhões / Tipos de Caminhão: `admin, logistica`
- Nenhuma alteração em `App.tsx`, rotas, ou banco.
