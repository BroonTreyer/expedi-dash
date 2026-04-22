

## Mostrar todos os produtos em "Clientes Afetados"

### Problema

Na tabela "Clientes Afetados" (Analytics → Rupturas), a coluna **Produtos** mostra só os 3 primeiros e indica "+N" para o resto, com `line-clamp-2` cortando o texto. O usuário precisa ver **todos** os produtos que faltaram para cada cliente.

A mesma lógica existe no CSV (que já exporta todos via `c.produtos.join(" | ")`), então o backend está OK — o problema é só visual.

### Mudança

**Arquivo:** `src/pages/Analytics.tsx` (linhas 923–925)

Trocar a célula da coluna "Produtos" para listar **todos** os produtos como badges/chips empilhadas, com quebra de linha natural e sem `line-clamp`:

```tsx
<TableCell className="py-2.5 min-w-[220px] max-w-[320px]">
  <div className="flex flex-wrap gap-1">
    {c.produtos.map((p) => (
      <span key={p} className="text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 break-words">
        {p}
      </span>
    ))}
  </div>
</TableCell>
```

E remover `truncate max-w-[140px]` do nome do cliente (linha 915) → trocar por `break-words` para nomes longos não cortarem (ex: "ANDERSON GAVIAO BEIJOINO" cabe inteiro).

### Mesmo ajuste em "Cargas com Pendência"

A tabela ao lado tem coluna vazia (linha 956) reservada para motoristas mas não renderiza nada. Aproveitar para mostrar todos os motoristas como chips na 4ª coluna, mesmo padrão.

### O que NÃO muda

- Hook `useAnalytics` — já agrega todos os produtos no `clienteRupturas[].produtos: string[]`.
- CSV export — continua exportando tudo.
- Limite Top 10 clientes — mantido (a queixa é sobre produtos por cliente, não a quantidade de clientes).
- Demais tabelas e abas.

### Resultado

Cada linha de cliente passa a mostrar **todos** os produtos que faltaram, como pequenas tags que quebram em múltiplas linhas dentro da célula. A altura da linha cresce conforme a quantidade — sem corte, sem "+N".

