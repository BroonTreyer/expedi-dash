

# Auditoria Completa do Sistema - Resultados

## Bugs Encontrados

### 1. Badge de ruptura ausente em linhas singulares (desktop) na pagina Rupturas
**Severidade: Media** - No fix anterior, o badge de ruptura no `codigo_produto` cell foi adicionado apenas nas **child rows expandidas** (linha 452-460). Porem, linhas de item unico (linha 323) continuam sem o badge. Na pagina de Rupturas (que esconde coluna "etapa"), itens singulares nao mostram indicacao visual de ruptura.

**Correcao**: Adicionar o mesmo badge de ruptura na celula `codigo_produto` das linhas singulares (linha 323).

### 2. Botao "Completar logistica" no header do grupo completa apenas o primeiro item
**Severidade: Media** - Linha 418-421: `onComplete(first)` abre o dialog de logistica apenas para o primeiro item do grupo. Os demais itens ficam sem dados de transporte.

**Correcao**: Ao clicar "Completar logistica" em grupo com multiplos itens, expandir o grupo (assim como o botao editar ja faz) para que o usuario complete cada item individualmente.

### 3. Console warnings: forwardRef em CarregamentoDialog e DeleteConfirmDialog
**Severidade: Baixa** - O console mostra "Function components cannot be given refs" para ambos. Embora nao quebre funcionalidade, polui o console.

**Correcao**: Envolver ambos componentes com `React.forwardRef`.

### 4. Filtro de status no dashboard nao inclui statuses de ruptura
**Severidade: Baixa** - O dropdown de status em `Filters.tsx` lista apenas `STATUSES`. Itens com status "Aguardando pedido" (rupturas no dashboard) aparecem no "todos" mas nao podem ser filtrados individualmente. Isso e provavelmente intencional ja que rupturas tem pagina propria, mas gera confusao quando itens com esse status aparecem na listagem principal.

**Correcao**: Adicionar opcao "Aguardando pedido" no filtro, ou adicionar um separador com os status de ruptura no dropdown.

### 5. Peso em TON na pagina Rupturas pode ser confuso para quantidades pequenas
**Severidade: Informativo** - Os pesos individuais sao pequenos (10-20kg). Mostrar como 0,0 TON nao e util. Porem, e uma escolha de design e nao um bug funcional.

---

## Itens Verificados (OK)

- Agrupamento por `numero_pedido` usando Map: **OK**
- Status em grupo muda todos os itens: **OK**
- Delete em grupo exclui todos os itens: **OK**
- Botao editar em grupo com multiplos itens expande: **OK**
- `colCount` = 13 base: **OK** (contagem correta)
- Kanban filtra itens de ruptura: **OK**
- Badge de ruptura em child rows expandidas: **OK**
- Badge de ruptura em mobile: **OK**
- Permissoes de Rupturas (faturamento nao altera status): **OK** (correto conforme regras)
- AppSidebar RefLink com forwardRef: **OK**
- Auth: sem signup publico, apenas login: **OK**
- RLS policies: permissivas para operacoes CRUD: **OK** (ja discutido anteriormente)
- Realtime: cache patch direto no UPDATE: **OK**
- Optimistic updates com rollback: **OK**

---

## Plano de Correcao

### Arquivo: `src/components/dashboard/CarregamentoTable.tsx`
1. **Linha 323** - Adicionar badge de ruptura na celula `codigo_produto` de linhas singulares (mesmo padrao das child rows):
```tsx
<TableCell className="text-sm font-mono">
  <span className="flex items-center gap-1.5">
    {c.codigo_produto ?? "—"}
    {c.ruptura && (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 ...">
        <AlertTriangle className="h-3 w-3" /> Ruptura
      </span>
    )}
  </span>
</TableCell>
```

2. **Linha 418-421** - Botao "Completar logistica" no header do grupo: expandir se multiplos itens, completar direto se unico:
```tsx
{canComplete && first.etapa === "vendas" && (
  <Button ... onClick={() => group.items.length > 1 ? toggle(group.pedido!) : onComplete(first)}>
    <ClipboardCheck ... />
  </Button>
)}
```

### Arquivo: `src/components/dashboard/CarregamentoDialog.tsx`
3. Envolver com `React.forwardRef` para eliminar warning.

### Arquivo: `src/components/dashboard/DeleteConfirmDialog.tsx`
4. Envolver com `React.forwardRef` para eliminar warning.

### Arquivo: `src/components/dashboard/Filters.tsx`
5. Adicionar status de ruptura ao dropdown com separador visual.

## Arquivos (4)
- `src/components/dashboard/CarregamentoTable.tsx`
- `src/components/dashboard/CarregamentoDialog.tsx`
- `src/components/dashboard/DeleteConfirmDialog.tsx`
- `src/components/dashboard/Filters.tsx`

