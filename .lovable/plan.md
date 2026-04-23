

## Tag "Finalizado" no Histórico — Carga Própria e Terceirizado

### Diagnóstico
O Histórico hoje não diferencia visualmente quem **finalizou** o ciclo. Em Carga Própria, o motorista passa por 4 etapas (chegada → saída rota → retorno → lacre/saída final). Quando termina, `etapa_carga_propria = "finalizado"` é gravado, mas a aba Histórico não mostra esse status — só aparece "Entrada" + "Saída", o que confunde com saídas parciais.

### Mudança única — `src/components/portaria/HistoricoTab.tsx`

1. **Calcular flag `finalizado` por grupo** dentro do `useMemo` que monta `grupos`:
   ```ts
   const finalizado =
     g.entrada?.etapa_carga_propria === "finalizado" ||
     g.saida?.etapa_carga_propria === "finalizado" ||
     g.entrada?.etapa_terceirizado === "finalizado" ||
     g.saida?.etapa_terceirizado === "finalizado" ||
     (!!g.entrada && !!g.saida && !["carga_propria","terceirizado"].includes(ref.categoria));
   ```
   Adicionar `finalizado: boolean` ao tipo `GrupoMovimento`.

2. **Desktop (tabela)** — coluna **Tipo**, ao lado dos badges Entrada/Saída:
   ```tsx
   {g.finalizado && (
     <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-700 dark:text-green-400">
       <CheckCircle2 className="h-3 w-3" /> Finalizado
     </Badge>
   )}
   ```

3. **Mobile (card)** — mesmo badge verde na linha de badges junto com Entrada/Saída/Categoria.

4. **Filtro rápido** em `src/pages/Portaria.tsx` — adicionar opção `"Finalizados"` ao `Select` de tipo (valor `"finalizado"`), filtrando `grupos.filter(g => g.finalizado)` na `HistoricoTab`.

### Verificação
1. `/portaria/carga-propria` → Histórico: motoristas que bateram lacre (etapa "finalizado") mostram badge verde **✓ Finalizado**.
2. Motoristas em rota ou retornados sem lacre **não** mostram a tag.
3. Filtro "Finalizados" lista apenas os concluídos.
4. Mesmo comportamento em `/portaria/terceirizado`.

### Fora do escopo
- KPIs novos no topo.
- Mudanças no banco/triggers.
- Aba "Pátio Atual" (já remove veículos finalizados).

