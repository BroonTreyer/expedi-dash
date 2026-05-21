## Alteração

No diálogo de Comprovante de Adiantamento/Quitação (`src/components/logistica/ComprovanteAdiantamentoDialog.tsx`), os números de CTE são listados na ordem em que vêm do banco, gerando saídas como `257/250/251/253/252/254/255/256/258`.

Vou ordená-los numericamente do menor para o maior antes de juntar com `/`, resultando em `250/251/252/253/254/255/256/257/258`.

## Detalhes técnicos

Nas duas ocorrências (linhas 75 e 96), substituir:

```ts
const numeros = ctes.map((r) => r.cte?.numero_cte).filter(Boolean).join("/");
```

por uma versão que ordena numericamente (com fallback alfabético para CTEs não-numéricos):

```ts
const numeros = ctes
  .map((r) => r.cte?.numero_cte)
  .filter(Boolean)
  .sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10);
    const nb = parseInt(String(b).replace(/\D/g, ""), 10);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  })
  .join("/");
```

Nenhuma outra mudança de comportamento.
