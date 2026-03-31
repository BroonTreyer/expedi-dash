

# Veículos Esperados em Aba Separada + Novo Nível "Portaria"

## 1. Mover Veículos Esperados para uma aba dedicada

Atualmente o painel de veículos esperados fica inline na página, acima dos filtros. Quando há muitos veículos, polui a tela.

**Solução**: Adicionar uma terceira aba nas Tabs existentes: **Pátio | Histórico | Esperados**

- Mover o `VeiculosEsperadosPanel` para dentro de `<TabsContent value="esperados">`
- Adicionar badge com contagem de pendentes na aba
- Remover o painel inline da posição atual (entre KPIs e filtros)

## 2. Criar nível "portaria" no sistema de usuários

Novo role que **só acessa a Portaria** e com restrições:
- **Não pode**: Registrar entrada/saída, exportar CSV, importar planilha
- **Pode**: Visualizar pátio, histórico, veículos esperados, filtrar, buscar, ver detalhes

### Mudanças necessárias

**Migração SQL**:
- Adicionar `'portaria'` ao enum `app_role`: `ALTER TYPE app_role ADD VALUE 'portaria'`

**`src/hooks/useAuth.ts`**:
- Adicionar `"portaria"` ao tipo `AppRole`

**`src/components/AppSidebar.tsx`**:
- Adicionar `"portaria"` ao array de roles do item `/portaria`

**`src/App.tsx`**:
- Adicionar `"portaria"` ao `allowedRoles` da rota `/portaria`

**`src/pages/Portaria.tsx`**:
- Reestruturar tabs para incluir aba "Esperados"
- Usar `useAuth()` para obter a role
- Esconder botões "Registrar", "CSV" e "Importar" quando `role === "portaria"`
- Esconder botão "Registrar Entrada" nos veículos esperados quando `role === "portaria"`
- Esconder botão "Limpar lista" quando `role === "portaria"`
- Esconder botão de registrar saída no PatioAtualTab quando `role === "portaria"`

**`src/components/portaria/VeiculosEsperadosPanel.tsx`**:
- Adicionar prop `readOnly?: boolean` para esconder botões de ação

**`src/pages/Usuarios.tsx`**:
- Adicionar opção "Portaria" no select de roles

## Arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar valor `portaria` ao enum `app_role` |
| `src/hooks/useAuth.ts` | Atualizar tipo `AppRole` |
| `src/components/AppSidebar.tsx` | Adicionar role `portaria` |
| `src/App.tsx` | Adicionar role `portaria` na rota |
| `src/pages/Portaria.tsx` | Aba "Esperados" + esconder ações para role portaria |
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Prop `readOnly` |
| `src/pages/Usuarios.tsx` | Opção "Portaria" no select |

