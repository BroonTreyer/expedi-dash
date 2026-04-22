
## Auditoria — Relatórios e Analytics

Foco: o que **a diretoria pede e hoje não tem**, ou tem mas vem errado/incompleto. Sem features inventadas.

---

### 1. Relatórios — o que existe hoje

Apenas **4 relatórios fixos** em Excel:
1. Resumo Diário de Expedição
2. Rupturas
3. Performance por Vendedor
4. Tempo Médio de Pátio

### Problemas reais identificados

**A. Relatórios incompletos / errados**
- **Resumo Diário** mostra "qtd_pedidos" contando *linhas de produto*, não pedidos únicos. Carga com 1 pedido de 5 itens vira "5 pedidos". Diretoria recebe número inflado.
- **Resumo Diário** não tem coluna de **transportadora vs frota própria**, **tipo de frete (CIF/FOB)**, **horário de saída/retorno**, **KM rodado**, **qtd entregas**. Tudo isso já está no banco.
- **Rupturas** não tem **valor financeiro estimado**, **vendedor responsável pela ruptura**, **status de resolução** — diretoria pergunta "quanto perdemos?" e ninguém responde.
- **Performance Vendedores** não tem **comparativo período anterior** (cresceu/caiu vs mês passado).
- **Tempo de Pátio** filtra `> 1440 min` silenciosamente. Veículo que ficou 25h some do relatório — exatamente o caso que a diretoria quer ver.

**B. Relatórios que faltam (a diretoria pede ou vai pedir)**
- **Faturamento diário/mensal por cliente** (top clientes, ABC) — não existe.
- **Faturamento por região (UF/cidade)** — Analytics tem mapa, relatório não tem.
- **Cargas por transportadora** com peso, custo médio, % de atraso — não existe.
- **Histórico por placa/motorista** (quantas viagens, KM total, ocorrências) — não existe.
- **Pedidos cancelados / devolvidos** — sequer há campo para isso.
- **Comparativo mês a mês** (peso, pedidos, rupturas, ticket médio) — não existe.
- **DRE operacional simplificado** (peso expedido × custo de frete estimado por km) — não existe.

**C. Como os relatórios são entregues**
- **Não há agendamento**: alguém precisa lembrar de gerar toda 2ª-feira manualmente.
- **Não há e-mail automático**: gera Excel → baixa → anexa no WhatsApp/e-mail manualmente.
- **Não há histórico**: ninguém sabe qual versão foi enviada quando.
- **Só formato Excel**: diretoria normalmente lê no celular → PDF ou imagem seria muito melhor.
- **Sem "favoritos" de período**: cada vez que abre, refaz a seleção.

**D. Personalização**
- Filtros são **só data**. Não dá para filtrar por: vendedor, transportadora, UF, tipo de carga, cliente.
- Não dá para escolher **quais colunas** sair no Excel.
- Não dá para **salvar um modelo** ("relatório do João", "fechamento mensal RH").

---

### 2. Analytics — o que existe hoje

Página tem 5 abas (Visão Geral, Expedição, Vendedores, Rupturas, Geografia) com KPIs e gráficos.

### Problemas reais

- **Não exporta nada** que esteja ali na tela. Vê o gráfico bonito → diretoria pede em planilha → ninguém consegue extrair direto.
- **Comparativo de período** (ex: "este mês vs anterior") não aparece de forma clara nos KPIs — só número absoluto.
- **Sem drill-down**: clica num número (ex: "23 rupturas") e nada acontece. Deveria abrir a lista.
- **Sem "enviar essa visão"**: gestor não consegue mandar o print/PDF da aba para alguém.
- **Filtros não persistem** entre abas.

---

### 3. Plano de correção (3 fases enxutas, sem invenção)

**Fase A — Corrigir o que está errado e completar os 4 relatórios atuais** (alta prioridade)

- Resumo Diário: contar **pedidos únicos** (`numero_pedido` distinto), adicionar colunas de frete/transportadora/horários/KM/entregas, adicionar **linha de totalizadores por dia**.
- Rupturas: adicionar **vendedor**, **valor estimado** (peso × ticket médio do produto), agrupamento por produto e por cliente em abas separadas da mesma planilha.
- Performance Vendedores: adicionar coluna **vs período anterior** (% crescimento), e aba secundária com detalhe diário.
- Tempo de Pátio: **deixar de esconder veículos > 24h** — eles devem aparecer marcados em vermelho (são justamente o problema).

**Fase B — Os 5 relatórios que faltam** (a diretoria já pede)

1. **Faturamento por Cliente** (ranking ABC, top 20, peso e qtd pedidos, % do total).
2. **Faturamento por Região** (UF e cidade, com participação % e ranking).
3. **Performance por Transportadora** (peso, viagens, tempo médio pátio, taxa de atraso).
4. **Histórico por Placa** (todas as viagens, KM total, ocorrências, motoristas que dirigiram).
5. **Comparativo Mensal** (mês atual vs anterior vs mesmo mês ano passado, em uma tela só).

**Fase C — Entrega automática e personalização** (tira retrabalho recorrente)

- **Filtros por vendedor / UF / transportadora / cliente** em todos os relatórios.
- **Escolher colunas** antes de gerar.
- **Salvar "Meu relatório"** (preset com nome + período + filtros + colunas).
- **Exportar em PDF** (não só Excel) — leitura no celular.
- **Agendamento**: "envie esse relatório toda 2ª-feira 7h para diretoria@frico" via Resend (ou WhatsApp via Twilio se preferir). Histórico de envios fica registrado.
- **Botão "Exportar visão atual" no Analytics**: gera PDF da aba aberta exatamente como está na tela.

---

### Como prosseguir

Por favor escolha **uma**:

1. **"Começa pela Fase A"** — corrijo os 4 relatórios existentes que estão com defeito/incompletos. ~1-2 dias de trabalho real, impacto imediato.
2. **"Pula para Fase B"** — crio os 5 relatórios novos. ~3-4 dias.
3. **"Quero Fase C antes"** — agendamento + e-mail + filtros. Resolve a dor do retrabalho semanal.
4. **"Faz tudo na ordem A → B → C"** — entrego em incrementos, validando cada um.

> Recomendação: **Fase A primeiro**. Se a diretoria está reclamando de relatório, é mais provável que os números **estejam errados** (pedido contado como linha, veículos sumindo do tempo de pátio) do que faltando — corrigir isso primeiro reconquista a confiança no sistema. Depois vamos para B e C.

E me diga também: **qual relatório específico a diretoria mais cobra hoje?** (ex: "fechamento mensal de cargas", "ranking de cliente", "rupturas da semana"). Se você apontar, eu priorizo esse antes dos outros.
