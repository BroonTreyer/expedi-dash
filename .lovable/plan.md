## Verificação do sistema — Expedição (Terceirizado)

Cruzei a lógica atual do `Expedicao.tsx` com os dados reais de hoje (29/04/2026). Existem 3 cargas terceirizadas:

| Carga | Status (carregamento) | Etapa Portaria | Peso efetivo |
|---|---|---|---|
| EDIVAR + VANESSA | **Carregado** | patio | 26.038,20 kg |
| DVA +ROBSON | Carregando | patio | 18.808,00 kg |
| EDIVAR+VANESSA+ELIAS | Pronto para carregar | chegou | 20.382,54 kg |
| **Total** | | | **65.228,74 kg** |

### Problemas identificados

**1. Carga "EDIVAR + VANESSA" classificada errada como "A carregar"**
Status do carregamento = `Carregado` (faturamento já marcou tudo carregado), mas a portaria ainda registra como `patio` (motorista entrou e ainda não saiu / não foi marcado "liberado"). A lógica atual só olha portaria e devolve `patio` → contabiliza esses 26 t como **"A carregar"**. Operacionalmente está errado — a carga já foi carregada, está só aguardando saída.

**2. Etapa `patio` está em "A carregar"**
Quando o caminhão já está dentro do pátio, na prática está em processo de carregamento (esperando doca ou sendo carregado). Hoje os 18,8 t do DVA+ROBSON aparecem como "A carregar" mesmo já estando no pátio.

**3. Carry-over de 30 dias inflando o "Total previsto do dia"**
A Expedição é um painel de operação **do dia**. Hoje o painel pode mostrar pedidos pendentes de dias anteriores como se fossem do dia, distorcendo o "Total previsto".

### Correções propostas

**A. Fallback por status quando portaria não cobre**
Se `status = 'Carregado'` no `carregamentos_dia` e a portaria ainda não registrou `expedido` → tratar como **Carregado** (não como "A carregar"). Resolve o caso EDIVAR+VANESSA.

**B. Etapa `patio` conta como "Carregado/Em carregamento"**
Mover `patio` do bucket "A carregar" para "Carregado/Em carregamento", junto com `carregando` e `expedido`. Mantém `aguardando` e `chegou` em "A carregar".

**C. Remover carry-over de 30 dias da Expedição**
O hook `useCargasDiaExpedicao` passa a buscar **somente a data selecionada**, sem incluir cargas pendentes de dias anteriores. O carry-over continua existindo no Consolidado (que é visão gerencial), mas na Expedição cada dia mostra só o seu universo.

### Resultado esperado para hoje após o fix

- Carregado / em carregamento: **26.038 + 18.808 = 44.846 kg** (2 cargas)
- A carregar: **20.382 kg** (1 carga — EDIVAR+VANESSA+ELIAS, ainda em "chegou")
- Total previsto: **65.228 kg** (3 cargas)

### Arquivos a alterar

- `src/hooks/useCargasDiaExpedicao.ts` — remover bloco do carry-over de 30 dias; manter apenas `eq('data', dateStr)`. Trazer também `status` (já traz).
- `src/pages/Expedicao.tsx` — no `useMemo` `pesosKpi`:
  - bucket "Carregado" = `etapa ∈ {patio, carregando, expedido}` **OU** `status = 'Carregado'`
  - bucket "A carregar" = restante (`aguardando`, `chegou`)

Sem mudanças de UI, sem mudanças de banco, sem migração.