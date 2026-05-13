## Diagnóstico

Os pesos da Expedição estão errados por duas causas distintas:

### 1. KPIs ignoram EDIVAR (30.020 kg) e cargas finalizadas hoje

A causa é a **"data efetiva"** das cargas terceirizadas. O hook `useCargasDiaExpedicao` busca `horario_saida_final` de TODAS as movimentações com aquele `carga_id`, sem filtrar por data, e usa essa saída para reatribuir o dia da carga. Quando o `carga_id` é reutilizado (caso comum: "EDIVAR", "JR", "ELIAS+EDIVAR" etc.), o sistema acha uma saída antiga e joga a carga de hoje para o passado.

Hoje (13/05) temos:

| Carga             | Peso       | Saída encontrada     | Data efetiva calculada | Resultado |
|-------------------|-----------:|----------------------|------------------------|-----------|
| EDIVAR (no pátio) | 30.020 kg  | 30/04 (carga antiga) | 30/04                  | sumiu     |
| EDIVAR+DMA+ALCIR  | 28.161 kg  | 12/05                | 12/05                  | sumiu     |
| Elvis Maraba      | 12.144 kg  | 13/05                | 13/05                  | aparece   |

Por isso o KPI mostra apenas **12.144 kg** em vez de **42.164 kg**.

### 2. Card QWE1B20 (Fagno) sem peso

O movimento de portaria está com `carga_id = 'JR'`, mas em `carregamentos_dia` não existe nenhuma carga chamada exatamente `JR` (existem `JR PERNIL`, `JR ROTA` etc., todas de outros dias). Como não há a carga, não há peso para mostrar no badge.

## Plano

### Correção 1 — Ignorar saídas antigas ao calcular a data efetiva

Em `src/hooks/useCargasDiaExpedicao.ts`, ao montar `saidaPorCarga`:

- Só considerar `horario_saida_final` que seja **>= a data da própria carga** (`r.data`).
- Implementação: agrupar a data mínima por `carga_id` antes da consulta, filtrar `.gte('horario_saida_final', minDataGlobal)` na query, e depois descartar por carga qualquer saída anterior à data daquela carga específica.

Resultado esperado:

- EDIVAR (data 13/05) ignora a saída antiga de 30/04 → sem `saidaPortariaIso` → fica em 13/05.
- EDIVAR+DMA+ALCIR (data 13/05) ignora a saída de 12/05 → fica em 13/05 e cai como "Carregado/Em carregamento" (status=Carregado).
- Elvis Maraba continua igual (saída 13/05 é válida).
- KPI passa de 12.144 kg → ~70.325 kg (30.020 EDIVAR no pátio + 28.161 EDIVAR+DMA+ALCIR carregada + 12.144 Elvis Maraba).

A mesma proteção também é aplicada em `cargaIdsSaidaHoje` (busca de cargas extras) — isso lá já está filtrado por janela do dia, então não muda.

### Correção 2 — Card QWE1B20 sem peso (caso operacional)

Sem mudança de código necessária aqui: o porteiro vinculou a placa ao `carga_id = 'JR'` que não existe como carga real. O ideal é a Logística atribuir a carga correta (algum `JR …` real do dia) usando "Vincular carga" no painel do pátio. Posso fazer isso pelo banco se você me disser qual carga é, mas não vou adivinhar.

### Arquivos alterados

- `src/hooks/useCargasDiaExpedicao.ts` — filtrar saídas antigas ao calcular `saidaPorCarga`.

Sem migração, sem mudança de schema, sem alterar UI.