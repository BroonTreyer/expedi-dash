

# Roadmap Estratégico — Expedição v3.0

## Visão Geral

O sistema atual cobre bem o fluxo operacional diário (pedidos → fechamento de carga → portaria → saída). A v3.0 deve elevar o sistema de **operacional** para **estratégico**, adicionando inteligência, automação e visibilidade para gestão.

---

## 1. Dashboard Gerencial com Analytics

**Problema**: Hoje só há KPIs do dia. Não existe visão histórica ou de tendências.

**Solução**: Nova página `/analytics` com:
- Gráfico de peso expedido por dia/semana/mês (linha)
- Ranking de vendedores por volume (barras)
- Taxa de ruptura ao longo do tempo (%)
- Tempo médio de permanência no pátio (portaria)
- Mapa de calor por UF de destino
- Filtros por período, vendedor, tipo de caminhão

**Impacto**: Gestores passam a tomar decisões com dados históricos, não só olhando o dia.

---

## 2. Notificações em Tempo Real (Push + In-App)

**Problema**: Mudanças de status e eventos críticos passam despercebidos quando o usuário não está olhando a tela.

**Solução**:
- Sino de notificações no header com badge de contagem
- Tabela `notifications` no banco com realtime
- Gatilhos automáticos:
  - Carga fechada → notifica portaria
  - Veículo esperado chegou → notifica logística
  - Ruptura registrada → notifica faturamento
  - Veículo no pátio há mais de X horas → alerta
- Marcar como lida, filtrar por tipo

**Impacto**: Comunicação entre setores sem WhatsApp ou ligação.

---

## 3. Timeline/Audit Log por Carga

**Problema**: Não há rastreabilidade de quem fez o quê e quando em cada pedido/carga.

**Solução**:
- Tabela `audit_log` (entity_type, entity_id, action, user_id, old_value, new_value, timestamp)
- Trigger no banco para registrar toda alteração em `carregamentos_dia` e `movimentacoes_portaria`
- Drawer lateral "Histórico" em cada pedido mostrando timeline visual
- Filtro por usuário e tipo de ação

**Impacto**: Rastreabilidade total, resolução de conflitos, compliance.

---

## 4. Agendamento e Janela de Carga

**Problema**: Veículos chegam sem horário definido, causando filas e ociosidade nas docas.

**Solução**:
- Nova tabela `agendamentos` com slots de horário por doca
- Ao fechar carga, atribuir slot de carregamento (ex: Doca 1, 08:00-09:30)
- Visão tipo calendário/Gantt das docas do dia
- Alerta quando dois agendamentos se sobrepõem
- Portaria vê o agendamento ao dar entrada no veículo

**Impacto**: Redução de tempo de espera, melhor uso das docas, previsibilidade.

---

## 5. Relatórios Automatizados (PDF/Excel + E-mail)

**Problema**: Relatórios são manuais — o usuário precisa entrar no sistema e imprimir.

**Solução**:
- Edge function que roda via cron (pg_cron ou externo)
- Gera relatório diário de expedição em PDF
- Envia por e-mail para lista configurável
- Relatórios disponíveis:
  - Resumo diário de cargas (já tem print, falta automação)
  - Relatório de rupturas da semana
  - Performance por vendedor (mensal)
  - Tempo médio de pátio por transportadora

**Impacto**: Gestão recebe informação sem precisar acessar o sistema.

---

## 6. Portal do Motorista / Transportadora

**Problema**: Motoristas e transportadoras não têm visibilidade de quando serão chamados.

**Solução**:
- Página pública (link com token) mostrando:
  - Status da carga atribuída ao motorista
  - Horário previsto de chegada
  - Documentos necessários
- Motorista recebe link por WhatsApp (integração futura)
- Transportadora vê todas suas cargas do dia

**Impacto**: Menos ligações, motorista chega preparado, profissionalismo.

---

## 7. Integração com ERP / WMS via Webhook

**Problema**: Pedidos são importados manualmente (planilha). Status não volta para o ERP.

**Solução**:
- Edge function de webhook para receber pedidos do ERP automaticamente
- Webhook de saída: quando status muda, envia evento para endpoint configurável
- Tela de configuração de webhooks (URL, eventos, retry)
- Log de webhooks enviados/recebidos

**Impacto**: Elimina digitação dupla, sincroniza sistemas, reduz erro humano.

---

## 8. IA Preditiva para Logística

**Problema**: A roteirização existe mas é reativa — não antecipa problemas.

**Solução** (usando Lovable AI — Gemini):
- **Sugestão de tipo de caminhão**: baseado no peso e quantidade de entregas, IA sugere o veículo ideal
- **Previsão de tempo de carregamento**: com base no histórico, estimar duração
- **Detecção de anomalias**: alertar quando peso de carga está muito acima/abaixo do padrão
- **Sugestão de agrupamento**: IA sugere quais pedidos combinar em uma carga antes do fechamento manual

**Impacto**: Decisões mais rápidas e precisas, menos retrabalho.

---

## Priorização Sugerida

| Fase | Feature | Esforço | Valor |
|------|---------|---------|-------|
| 3.0.1 | Notificações in-app | Médio | Alto |
| 3.0.1 | Timeline/Audit Log | Médio | Alto |
| 3.0.2 | Dashboard Analytics | Alto | Alto |
| 3.0.2 | Agendamento de Docas | Alto | Alto |
| 3.0.3 | Relatórios Automatizados | Médio | Médio |
| 3.0.3 | Portal Motorista | Médio | Médio |
| 3.1 | Integração ERP/Webhook | Alto | Alto |
| 3.1 | IA Preditiva | Médio | Médio |

---

Qual dessas features você quer começar a implementar?

