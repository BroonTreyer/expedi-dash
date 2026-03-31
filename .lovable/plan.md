

# Controle de Terceirizados em 3 Etapas

## Problema

Terceirizados precisam de 3 etapas rastreadas: **Chegada** (caminhão chega na portaria), **Entrada** (liberado para entrar no pátio) e **Saída** (saiu do pátio). Hoje o sistema só registra "entrada" e "saída", sem distinção entre chegada e entrada efetiva.

## Solução

### 1. Migration — novos campos no banco

Adicionar à `movimentacoes_portaria`:
```sql
ALTER TABLE movimentacoes_portaria 
  ADD COLUMN horario_chegada timestamptz,
  ADD COLUMN horario_entrada timestamptz,
  ADD COLUMN etapa_terceirizado text; -- 'aguardando' | 'no_patio' | 'finalizado'
```

Quando um terceirizado registra entrada:
- `horario_chegada` = now() (hora que chegou)
- `etapa_terceirizado` = `'aguardando'`

Quando o operador libera a entrada:
- `horario_entrada` = now()
- `etapa_terceirizado` = `'no_patio'`

Quando registra saída:
- Registro de saída vinculado normalmente
- `etapa_terceirizado` do registro de entrada = `'finalizado'`

### 2. PatioAtualTab — incluir terceirizados com etapas

Remover o filtro que exclui terceirizados (linha 94). Exibir terceirizados no pátio com badges de etapa:
- 🟡 **Aguardando** — chegou mas não entrou
- 🟢 **No Pátio** — liberado, dentro do pátio
- Botões de ação: "Liberar Entrada" (aguardando → no_patio) e "Registrar Saída" (no_patio → finalizado)

### 3. RegistroMovimentoDialog — setar campos na criação

Ao salvar entrada de terceirizado:
- `horario_chegada` = new Date().toISOString()
- `etapa_terceirizado` = "aguardando"

### 4. Ação "Liberar Entrada" no PatioAtualTab

Novo botão para terceirizados com `etapa_terceirizado = 'aguardando'`:
- Chama `useUpdateMovimentacao` com `{ horario_entrada: now(), etapa_terceirizado: 'no_patio' }`

### 5. Ação "Registrar Saída" para terceirizados

Terceirizados com `etapa_terceirizado = 'no_patio'`:
- Usa saída rápida (já existente) ou dialog de saída
- Atualiza entrada com `etapa_terceirizado = 'finalizado'`

### 6. Histórico e KPIs

- `HistoricoTab`: exibir coluna com horários (chegada / entrada / saída) para terceirizados
- `PortariaKpiCards`: contar terceirizados aguardando separadamente

### 7. Interface do MovimentacaoPortaria (hook)

Adicionar `horario_chegada`, `horario_entrada`, `etapa_terceirizado` na interface TypeScript.

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `horario_chegada`, `horario_entrada`, `etapa_terceirizado` |
| `src/hooks/useMovimentacoesPortaria.ts` | Adicionar campos na interface |
| `src/components/portaria/RegistroMovimentoDialog.tsx` | Setar `horario_chegada` e `etapa_terceirizado` ao criar entrada de terceirizado |
| `src/components/portaria/PatioAtualTab.tsx` | Remover exclusão de terceirizados, adicionar botões "Liberar Entrada" e "Saída", badges de etapa |
| `src/components/portaria/PortariaKpiCards.tsx` | Adicionar KPI "Aguardando" para terceirizados |
| `src/pages/Portaria.tsx` | Ajustar contagem de pátio para incluir terceirizados |

