

## Detalhes do Movimento: mostrar TODAS as fotos registradas

### Diagnóstico

Hoje o diálogo de detalhes só mostra fotos do(s) registro(s) que recebe via props (`movimento` + `movimentoSaida`). Mas:

- **Carga Própria** grava **vários registros separados** por etapa (entrada, retornou, finalizado, etc.) — cada um com suas próprias fotos. O agrupamento na tabela passa apenas **1 registro** ao diálogo, então só as fotos daquele registro aparecem (ex.: placa + painel KM do "retornou", faltando a foto do lacre que está no registro "finalizado").
- **Terceirizado** grava entrada e saída como registros separados **sem `movimento_vinculado_id`** → o agrupamento na `HistoricoTab` falha em pareá-los, então o diálogo recebe ou só a entrada (sem fotos) ou só a saída (placa + doc + lacre, sem painel/nota se existirem em outro registro).

Resultado: o usuário vê só 2 fotos (placa + painel) quando na verdade existem mais distribuídas em outros registros do mesmo veículo/carga.

### Solução

Buscar **todos os registros relacionados** dentro do diálogo `MovimentoDetailsDialog` e agregar as fotos de todos eles, deduplicando por URL.

#### O que muda

1. **Nova query no `MovimentoDetailsDialog`** — quando o diálogo abre, faz uma busca em `movimentacoes_portaria` por registros relacionados ao veículo/carga atual:
   - **Carga Própria:** busca por `placa = m.placa` + janela de data ±2 dias da `m.data_hora` + mesma `categoria`. Agrupa todos os registros do mesmo veículo no ciclo (chegada → em rota → retorno → lacre).
   - **Terceirizado/Outros:** busca por `placa = m.placa` + mesma data (00:00–23:59) + mesma `categoria`, capturando entrada e saída mesmo sem `movimento_vinculado_id`.
   - **Filtro adicional:** se houver `carga_id`, prioriza registros com o mesmo `carga_id` para evitar misturar veículos diferentes em dias com o mesmo veículo voltando.

2. **Agregar fotos de TODOS os registros** — a função que monta `allPhotos` passa a iterar sobre todos os registros relacionados (não só `m` e `sDistinct`). Para cada um, coleta as 5 URLs de foto (placa, documento, painel, nota, lacre) com label que indica a etapa de origem (ex.: "📷 Foto da Placa (Chegada)", "🛞 Painel KM (Retorno)", "🔒 Foto do Lacre (Saída Final)"). Continua deduplicando por URL pra não repetir a mesma foto se aparecer em registros diferentes.

3. **Labels com contexto da etapa** — pra Carga Própria, derivar o label a partir de `etapa_carga_propria` do registro de origem (chegou → "Chegada", em_rota → "Saída p/ Rota", retornou → "Retorno", finalizado → "Saída Final"). Pra Terceirizado, usar `etapa_terceirizado` (no_patio → "No Pátio", finalizado → "Saída"). Mantém os emojis atuais.

4. **Loading state mínimo** — enquanto a query busca os registros relacionados, mantém as fotos do `m`/`s` originais visíveis (sem flicker). Quando a query resolve, substitui pela lista completa.

#### O que NÃO muda

- Sem migration. Sem alteração no schema do banco nem nas triggers.
- A lógica de pareamento da `HistoricoTab` continua igual — o diálogo é que ganha autonomia pra agregar.
- Demais seções do diálogo (horários, identificação, operação, controle) não mudam — só a seção de fotos.
- Comportamento pra "outros" (visitante, fornecedor, prestador) continua igual quando não há mais registros do mesmo veículo no dia.

### Detalhes técnicos

**Query nova (resumo):**
```ts
const { data: relatedRecords } = useQuery({
  queryKey: ["mov-related-photos", m.placa, m.categoria, m.carga_id, dataMovimento],
  enabled: open && !!m.placa,
  queryFn: async () => {
    const dFrom = ...; const dTo = ...; // ±2 dias
    let q = supabase.from("movimentacoes_portaria")
      .select("id, tipo_movimento, etapa_carga_propria, etapa_terceirizado, foto_placa_url, foto_documento_url, foto_painel_url, foto_nota_url, foto_lacre_url, texto_placa_lido, confianca_placa, data_hora, carga_id")
      .eq("placa", m.placa).eq("categoria", m.categoria)
      .gte("data_hora", dFrom).lte("data_hora", dTo)
      .order("data_hora", { ascending: true });
    if (m.carga_id) q = q.or(`carga_id.eq.${m.carga_id},carga_id.is.null`);
    return (await q).data || [];
  }
});
```

**Builder de fotos:** itera `relatedRecords`, deriva label a partir de `tipo_movimento` + etapa, faz `pushPhoto(url, alt, label)` com dedup por URL. Fallback pros records originais (`m`, `s`) caso a query ainda não tenha respondido.

