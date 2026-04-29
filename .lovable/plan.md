## Visão Expedição — Terceirizado (read-only)

Nova página dedicada para a equipe de expedição acompanhar, em uma única tela, todos os veículos terceirizados ligados ao dia: o que está no pátio, quem chegou e aguarda liberação, quem ainda vai chegar e quais cargas já estão fechadas esperando o caminhão.

### Onde fica

- Rota nova: `/expedicao` (somente terceirizado)
- Item no menu lateral, dentro do grupo **Portaria**, logo após "Terceirizados", chamado **"Visão Expedição"** (ícone `Monitor`)
- Acesso: `admin`, `logistica`, `portaria` (mesmo padrão da Portaria)

### Layout da tela

Cabeçalho com data (padrão hoje, com seletor de período igual ao da Portaria) + KPIs resumo no topo. Abaixo, 4 painéis em grid responsivo:

```text
+-----------------------------------------------------------+
|  Visão Expedição — Terceirizado            [Hoje ▾] [↻]  |
+-----------------------------------------------------------+
|  KPIs:  Pátio  •  Chegou  •  A chegar  •  Cargas prontas |
+-----------------------------------------------------------+
|  [ NO PÁTIO ]            |  [ CHEGOU — aguardando ]      |
|  cards/lista placa,      |  cards com cronômetro          |
|  motorista, transp.,     |  desde a chegada               |
|  carga, tempo no pátio   |                                |
+--------------------------+--------------------------------+
|  [ A CHEGAR ]            |  [ CARGAS FECHADAS ]          |
|  veículos esperados      |  cargas prontas sem veículo    |
|  pendentes (placa,       |  registrado, com peso/pedidos  |
|  motorista, transp.,     |  e placa prevista              |
|  destino, peso)          |                                |
+--------------------------+--------------------------------+
```

- Tudo somente leitura: nenhum botão de ação (sem registrar saída, sem liberar entrada, sem cancelar). A equipe usa as páginas de Portaria para agir; a Visão Expedição é o painel de acompanhamento.
- Auto-refresh a cada 30s (consistente com o cronômetro do painel atual de cargas fechadas) + invalidação reativa via realtime que já existe.
- Mobile: painéis empilhados (1 coluna). Desktop: 2 colunas. Em telas grandes (≥1280px), opção de modo "TV" (4 colunas) com fonte ampliada para exibir num monitor de pátio.

### Conteúdo de cada painel

1. **No Pátio** — `movimentacoes_portaria` onde `categoria='terceirizado'`, com `horario_entrada` preenchido e `etapa_terceirizado != 'finalizado'`. Mostra placa, motorista, transportadora, carga, hora de chegada/entrada, tempo no pátio (com cores: amarelo ≥4h, vermelho ≥8h — mesma régua atual).

2. **Chegou — aguardando liberação** — `movimentacoes_portaria` `categoria='terceirizado'`, `etapa_terceirizado='chegada'` (ou `horario_chegada` preenchido) sem `horario_entrada`. Mostra placa, motorista, carga, hora de chegada e cronômetro vivo de espera.

3. **A chegar** — `veiculos_esperados` do dia com `grupo='TERCEIRIZADO'` e `conferido=false`, sem chegada registrada. Mostra placa, motorista, transportadora, destino/rota, peso, qtd entregas. Indicação visual de atraso quando `data_referencia < hoje`.

4. **Cargas fechadas aguardando veículo** — reusa `useCargasFechadasAguardando` filtrado por terceirizado (com `transportadora` preenchida). Mostra nome da carga, peso total, qtd pedidos, placa prevista, transportadora.

### KPIs no topo

Quatro contadores, refletindo o total de cada painel abaixo, com mini-ícone e cor semântica.

### Detalhes técnicos

- Nova página: `src/pages/Expedicao.tsx`
- Novos componentes (todos em `src/components/expedicao/`):
  - `ExpedicaoKpiCards.tsx`
  - `PainelNoPatio.tsx`, `PainelChegou.tsx`, `PainelAChegar.tsx`, `PainelCargasFechadas.tsx`
- Reaproveita os hooks existentes: `useMovimentacoes`, `useVeiculosEsperados`, `useCargasFechadasAguardando` — sem mudanças no backend, sem novas migrações.
- Roteamento em `src/App.tsx`: `lazyWithRetry(() => import("./pages/Expedicao"))` + `<Route path="/expedicao" element={<ProtectedRoute allowedRoles={["admin","logistica","portaria"]}><Expedicao /></ProtectedRoute>} />`.
- Sidebar (`AppSidebar.tsx`): nova `NavLeaf` dentro de "Portaria" com `to: "/expedicao"`, ícone `Monitor`, mesmas roles.
- Cronômetro de espera com `setInterval` de 30s pausado quando aba não está visível (`visibilityState`), igual aos painéis atuais.
- Sem novos secrets, sem novas tabelas/RLS.

### Itens fora de escopo (intencional)

- Não cria visão para Carga Própria (a pedido).
- Não inclui ações (saída, liberação, cancelamento) — fica nas páginas de Portaria.
- Não cria histórico/exportação — só visão de "agora".