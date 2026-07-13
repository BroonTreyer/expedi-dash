## Problema

Fernando Rodrigues (placa `DPC6I72`, carga `CG-20260713-091038-XQM`) foi vinculado pela Logística hoje (13/07), mas a Portaria **não viu** a carga no painel azul "Cargas fechadas aguardando veículo". A portaria teve que fazer walk-in manual, gerando duplicidade.

## Causa raiz

`useCargasFechadasAguardando` (src/hooks/useCarregamentos.ts, l. 466-489) filtra `carregamentos_dia.data >= hoje - 7 dias`. A carga do Fernando foi **fechada hoje**, mas o campo `data` (data planejada) é `2026-06-17` — quase um mês no passado (pré-carga antiga). Resultado: carga excluída da query principal.

Existe um bloco de defesa (l. 497-526) que traz cargas fora da janela **se** já houver `movimentacoes_portaria` pendente. Mas quando a chegada ainda não foi registrada (é justamente o caso do Fernando), esse fallback não pega. Faltam as cargas fechadas cuja única evidência é o `veiculos_esperados` recém-criado pela Logística.

## Correção

Adicionar um segundo bloco de defesa em `useCargasFechadasAguardando`: também trazer cargas fechadas que têm um `veiculos_esperados` criado nos últimos 7 dias com `conferido=false` e `walk_in=false` (linha criada pela Logística ao fechar), mesmo quando `carregamentos_dia.data` está fora da janela.

### Arquivo

**`src/hooks/useCarregamentos.ts`** — dentro de `useCargasFechadasAguardando`, logo após o bloco atual `try { ... movimentacoes_portaria ... } catch { }` (l. 497-526), adicionar:

```ts
try {
  const desde7d = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: veRecentes } = await supabase
    .from("veiculos_esperados")
    .select("carga_id")
    .eq("walk_in", false)
    .eq("conferido", false)
    .not("carga_id", "is", null)
    .gte("created_at", desde7d);
  const jaPresentes = new Set(cargasArr.map((c) => c.carga_id));
  const faltantes = Array.from(
    new Set(((veRecentes ?? []) as any[])
      .map((v) => v.carga_id)
      .filter((id) => id && !jaPresentes.has(id))),
  );
  if (faltantes.length > 0) {
    const extras = await fetchAllPaginated<any>((from, to) =>
      supabase
        .from("carregamentos_dia")
        .select("carga_id, nome_carga, placa, motorista, transportadora, tipo_caminhao, peso, data, id")
        .eq("etapa", "logistica")
        .in("carga_id", faltantes)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (extras.length > 0) cargasArr.push(...extras);
  }
} catch { /* silencioso */ }
```

### Limpeza pontual (Fernando)

- Deletar `veiculos_esperados.d24772a2-...` (walk-in duplicado, carga_id null) OU vinculá-lo à carga `CG-20260713-091038-XQM` — a decidir na hora do build.
- O movimento de portaria `93d8b2a6-...` (chegada walk-in sem carga) fica; se aplicável, casar `carga_id` para a carga fechada.

Quer que eu também faça esse acerto do registro atual do Fernando no mesmo build, ou só corrijo o bug e você lida com o registro pela interface (vincular na tela)?