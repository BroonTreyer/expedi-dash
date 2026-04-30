## Bugs encontrados na auditoria

### Bug #1 — Admin "Finalizar fantasmas" usa etapa errada (CRÍTICO)
**Arquivo:** `src/components/portaria/PortariaAdminPanel.tsx` (linhas 73 e 96)

A mutation marca registros como `etapa_terceirizado: "saida"`, mas esse é um estado **intermediário**. O resto do sistema (`PainelNoPatio`, `Portaria.tsx`, `useStatusPortariaPorCarga`, `PortariaKpiCards`, `PatioAtualTab`) só remove do pátio quando `etapa_terceirizado === "finalizado"`.

**Sintoma confirmado em produção:** 8+ registros marcados "Finalizado em lote pelo admin" continuam aparecendo no pátio porque ficaram na etapa errada (`saida` em vez de `finalizado`). Exemplos: SZP8G56, BRA2E19, MXE9B40, TFK2C79, etc.

**Correção:**
- Trocar `etapa_terceirizado: "saida"` por `etapa_terceirizado: "finalizado"` nas 2 mutations.
- Migração de dados: UPDATE nos 8 registros existentes com observação `[Finalizado ... pelo admin - registro antigo]` para corrigir a etapa.

---

### Bug #2 — Triggers duplicados em `veiculos_esperados` (notificações em dobro)
**Banco:** schema `public`

A tabela `veiculos_esperados` tem 2 pares de triggers idênticos:
- `trg_on_veiculo_chegou` + `trg_veiculo_chegou` → ambos chamam `on_veiculo_chegou()`
- `trg_on_walkin_status_change` + `trg_walkin_status_change` → ambos chamam `on_walkin_status_change()`

**Sintoma:** cada chegada de veículo gera 2 notificações idênticas; cada mudança de status walk-in gera 2 notificações.

**Correção:** Migration que faz `DROP TRIGGER IF EXISTS trg_veiculo_chegou` e `DROP TRIGGER IF EXISTS trg_walkin_status_change` (mantém os com prefixo `trg_on_*`, padrão usado nas demais tabelas).

---

### Bug #3 — Carga histórica sem veículo esperado
**Carga:** `EDIVAR + VANESSA` (85 itens, placa QWA2B01, transp. MOREIRA)

Provavelmente criada antes do trigger `trg_vincular_veiculo_tardio` existir, ou a placa foi adicionada por update direto que não satisfez a condição do trigger. Não há outras cargas afetadas.

**Correção:** Insert único em `veiculos_esperados` para essa carga, status `previsto`, grupo `TERCEIRIZADO`. Sem mudança de código.

---

### Itens auditados e considerados OK / não-bugs
- `0` walk-ins órfãos > 24h (estado limpo após fix do trigger)
- `0` cargas com `veiculos_esperados` duplicados
- `0` pedidos sem `numero_pedido` em etapa não-rascunho
- `0` pesos/quantidades negativos
- 7 movimentos de carga própria parados em `aguardando_liberacao` desde 10/04 — todos do mesmo dia, padrão de teste antigo, não bug ativo
- 42 rupturas sem motivo nos últimos 30 dias — comportamento intencional (motivo é opcional ao sinalizar)
- Triggers **estão** todos habilitados (o bloco `<db-triggers>` do contexto estava enganoso — verificado direto via `pg_trigger`)

---

### Plano de execução

1. **Migração SQL** (`supabase/migrations/...`):
   - DROP dos 2 triggers duplicados em `veiculos_esperados`
   - UPDATE nos registros admin-finalizados com etapa errada (`etapa_terceirizado='saida'` + observação contém `pelo admin`) → setar `etapa_terceirizado='finalizado'`
   - INSERT do `veiculo_esperado` faltante para carga `EDIVAR + VANESSA`

2. **Edição de código** (`src/components/portaria/PortariaAdminPanel.tsx`):
   - Trocar `etapa_terceirizado: "saida"` → `"finalizado"` nas duas mutations (linhas 73 e 96)

Risco: baixo. Nenhuma mudança em fluxo de negócio normal — só corrige um valor literal que estava errado, deduplica triggers que já são idempotentes, e regulariza dados históricos.

Quer que eu aplique?
