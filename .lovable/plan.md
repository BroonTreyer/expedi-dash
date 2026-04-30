## Auditoria do Sistema — Resultados

Verifiquei código, banco, triggers, RLS, hooks e logs. Abaixo os achados, separados por gravidade.

### 1. CRÍTICO (UX) — Cards sumindo após "Registrar Chegada" em terceirizado

**O que descobri:** o handler `openRegistroFromVeiculoEsperado` em `src/pages/Portaria.tsx` (linhas 135-185) já está correto — cria o movimento direto com `etapa_terceirizado='chegada'`. Mas tem um efeito colateral: **chama `marcarConferidoMutation` imediatamente**, marcando `veiculos_esperados.conferido=true`. Isso faz a carga sumir do card azul "Cargas Fechadas Aguardando" (que filtra `conferido=true`) **antes mesmo de o porteiro liberar a entrada no pátio**. Resultado: o card azul some, e a carga só reaparece como "Aguardando liberação" no painel laranja — perdendo a sequência visual vermelho→azul→verde que o usuário pediu.

**Correção:** marcar `conferido=true` apenas quando o porteiro **liberar a entrada no pátio** (segunda etapa, `horario_entrada` preenchido), não na chegada. A lista de Esperados já trata esse caso (filtra por `conferido=false`), e a tela "Aguardando liberação" continua aparecendo.

### 2. DADOS — 6 cargas com previsão duplicada em `veiculos_esperados`

**Cargas afetadas:** `ELIAS ROTA` (3 registros), `JR MIX` (3), `SANTA LUCIA` (2), `JR` (2), `EDIVAR` (2), `ELIAS + EDIVAR` (2).

**Causa:** o trigger `on_carga_fechada` cria 1 previsão automática quando a carga fecha; quando um walk-in com a mesma placa também é criado pelo porteiro, vira duplicata. O `ON CONFLICT DO NOTHING` do trigger não pega porque só há `UNIQUE` em outro conjunto de colunas. Todos os duplicados já estão `conferido=true`, então não atrapalham mais — mas vão poluir relatórios futuros.

**Correção:** migration única para limpar duplicatas mantendo o registro mais antigo de cada `carga_id`, e adicionar índice parcial `UNIQUE(carga_id) WHERE walk_in=false` para impedir reincidência.

### 3. SUJEIRA — 5 entradas "fantasma" sem saída há mais de 10 dias

Movimentos terceirizados em `etapa='no_patio'` desde 17-20/abril (placas `SZP8G56`, `ROO9D09`, `TFK2C79`, `OAW4J70`, `ONC6549`). Não são exibidos no Pátio Atual porque o filtro de 7 dias de `useMovimentacoesAtivasPatio` já os exclui, mas continuam ocupando a base e afetando KPIs históricos.

**Correção:** não mexer no banco automaticamente — apresentar lista no painel admin de Portaria com botão "Marcar como finalizado" (one-click). Evitar deletar dados sem confirmação.

### 4. SUJEIRA — 30 veículos esperados antigos (>7 dias) não conferidos

São entradas previstas que nunca chegaram. Não causam bug, mas inflam queries.

**Correção:** mesma solução do item 3 — botão "Limpar antigos" (>30 dias, não conferidos) no painel admin. Sem ação automática.

### 5. INFORMATIVO — 42 warnings do linter (não vou alterar)

Todos do mesmo tipo: "SECURITY DEFINER function executable by anon/authenticated". São funções legítimas (`has_role`, `notify_role`, `get_portal_token_public`, etc.) que **precisam** ser SECURITY DEFINER para funcionar. Revogar `EXECUTE` quebraria autenticação, notificações e portal do motorista. Risco real = baixo, falso positivo do scanner. Recomendo manter.

---

## Plano de implementação

```text
1. src/pages/Portaria.tsx
   - Remover marcarConferidoMutation do handler de "Registrar Chegada"
   - Adicionar handler "Liberar Entrada no Pátio" que faz UPDATE
     (horario_entrada=now, etapa_terceirizado='no_patio') E marca conferido

2. src/components/portaria/CargasFechadasAguardandoPanel.tsx (verificar)
   - Confirmar que mostra botão "Liberar Entrada" para cargas
     com movimento já em etapa='chegada'

3. Migration SQL única:
   - Limpar duplicatas em veiculos_esperados (manter mais antigo)
   - CREATE UNIQUE INDEX ON veiculos_esperados(carga_id) WHERE walk_in=false

4. src/components/portaria/PortariaAdminPanel (novo painel pequeno,
   visível só para admin/logistica) com:
   - "5 entradas pendentes há +10 dias" → botão Finalizar
   - "30 veículos esperados antigos" → botão Limpar
```

**Não mexido:** linter warnings (item 5), saídas de `carga_propria` sem vínculo (é design correto — frota própria usa um único movimento `tipo='saida'` para todo o ciclo).

Pronto para implementar quando aprovar.