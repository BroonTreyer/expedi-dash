

## Ajustar alerta de tempo no Pátio Atual — não alarmar veículos "Em Rota"

### Problema

Na aba **Pátio Atual**, a coluna **Tempo** colore em **amarelo (≥4h)** e **vermelho (≥8h)** com base no tempo desde a chegada (`data_hora`), sem considerar a etapa atual do Carga Própria.

Resultado: veículos que já saíram para rota (`etapa_carga_propria === "em_rota"`) aparecem em vermelho/amarelo só porque a entrega demora — o que **é o esperado**, não uma anomalia. O alerta perde sentido porque dispara para o caso normal.

O alerta deveria sinalizar **veículos parados muito tempo dentro do pátio**, não veículos que estão fora rodando.

### Solução

Em `src/components/portaria/PatioAtualTab.tsx`:

1. Para Carga Própria com `etapa_carga_propria === "em_rota"`, a coluna **Tempo** deixa de usar o esquema de alerta amarelo/vermelho. Fica neutra (`text-muted-foreground`), sem ícone de `AlertTriangle`, sem destacar a linha (sem `border-destructive/40` no card mobile).
2. Para todas as outras situações (Chegou, Retornou, Terceirizado, Fornecedor, Visitante etc — veículos efetivamente **dentro do pátio**), o alerta continua igual: amarelo ≥4h, vermelho ≥8h.
3. Opcional/leve: trocar o rótulo do tempo da linha "Em Rota" pelo tempo desde a **saída p/ rota** (`horario_saida_rota`) em vez de desde a chegada — assim a coluna passa a mostrar "há quanto tempo está rodando", que é a informação útil para essa etapa. Se o campo não existir no registro, mantém o tempo desde `data_hora` mas sempre neutro.

### Mudanças concretas

- ✏️ `src/components/portaria/PatioAtualTab.tsx`:
  - Helper `getTempoClass(minutos, isEmRota)` — quando `isEmRota=true`, retorna sempre `text-muted-foreground`.
  - Render desktop (linha ~347): passar `m.categoria === "carga_propria" && m.etapa_carga_propria === "em_rota"`. Esconder ícone `AlertTriangle` quando em rota.
  - Render mobile (linha ~213): mesma condição — não aplicar `border-destructive/40` / `border-yellow-500/40` no `<Card>` quando em rota. Esconder ícone `AlertTriangle` no bloco de tempo.
  - Cálculo de `minutos`: se `m.etapa_carga_propria === "em_rota"` e existir `m.horario_saida_rota`, usar `differenceInMinutes(now, new Date(m.horario_saida_rota))`. Caso contrário, mantém o cálculo atual.

Sem mudança de banco. Sem nova feature. Apenas ajusta o critério visual do alerta para parar de gritar com o cenário normal (veículo em rota).

