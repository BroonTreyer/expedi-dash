## Problema

No diálogo de **Comprovante de Adiantamento** (`ComprovanteAdiantamentoDialog.tsx`), todos os CT-es da transportadora são colapsados em **uma única linha**, mostrando o peso e valor total somados. O usuário precisa que cada **carga** apareça **separadamente** (nome da carga, peso, CT-es e valor), igual ao formato manual do WhatsApp.

### Hoje (errado)
```
1.MOREIRA TRANSPORTES E LOG LTDA (89.692,76 Kg) CTE
666/667/...682
*VLR R$ 109.287,13*
```

### Desejado
```
1. Especial Mateus carro 4 (30.040,00 KG)  CTE 667/668/669-686    VLR R$ 35.146,80
2. Especial Agile (28.000,00 KG)  CTE 670/671                     VLR R$ 31.230,00
3. Especial Edivar Rota (36.731,30 KG)  CTE 672/673/.../682       VLR R$ 42.910,33
```

## Solução

Agrupar os CT-es de cada adiantamento por **carga** (`carga_id` do CT-e) e renderizar uma linha por carga, usando o `nome_carga` vindo de `carregamentos_dia`.

### Passos

1. **Buscar nomes das cargas** — após carregar os CT-es, coletar os `carga_id` distintos e fazer um único `select carga_id, nome_carga from carregamentos_dia where carga_id in (...)`. Guardar num `Map<carga_id, nome_carga>`.

2. **Agrupar CT-es por carga** dentro de cada adiantamento. Para CT-es sem `carga_id`, agrupar por `ordem_carga` como fallback; se nem isso existir, agrupar em "Sem carga".

3. **Renderizar uma linha por carga** com numeração contínua entre transportadoras (1, 2, 3...):
   - `N. {nome_carga ?? ordem_carga ?? "—"} ({peso} KG)  CTE {numeros}    VLR {valor}`
   - `peso` = soma de `cte.peso_total` do grupo
   - `numeros` = `numero_cte` ordenados numericamente, juntos por `/`
   - `valor` = soma de `cte.valor_frete` do grupo (ou `adt_ctes.valor_frete` se preferir respeitar overrides — manter o atual: `cte.valor_frete`)

4. **Rodapé** continua igual: Valor Total do Frete, % de adiantamento, valor adt, Código + PIX (uma vez por transportadora).

5. **Modo quitação** recebe o mesmo agrupamento (linhas por carga, mantendo o resumo de adt pago e saldo no final do bloco da transportadora).

### Arquivos

- `src/components/logistica/ComprovanteAdiantamentoDialog.tsx` — única alteração; refatorar o `useMemo texto` para usar agrupamento por carga e adicionar um `useQuery` que busca `nome_carga` para os `carga_id` carregados.

### Notas técnicas

- Reaproveita as `ctesQueries` já existentes (não muda RLS nem schema).
- A consulta de nomes usa `carregamentos_dia` (já permitida para admin/logística/faturamento).
- Sem mudanças de banco, hooks ou outros componentes.
