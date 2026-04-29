## Problema confirmado

O badge mostra "Aguardando chegada" mesmo quando o motorista terceirizado **já chegou na portaria**, porque o fluxo tem 2 momentos distintos antes do "No pátio":

1. **Chegou** — porteiro registra a chegada (grava `etapa_terceirizado='chegada'` + `horario_chegada`, mas **não** `horario_entrada`)
2. **Liberado pra pátio** — porteiro libera entrada (grava `etapa_terceirizado='no_patio'` + `horario_entrada`)

Hoje o passo 1 cai em `"aguardando"` (= "Aguardando chegada"), o que confunde o usuário porque o motorista já chegou. Confirmado em produção: existe registro com `etapa_terceirizado='chegada'`, `horario_chegada` preenchido e `horario_entrada` nulo.

## Solução

Adicionar uma etapa intermediária **`chegou`** entre `aguardando` e `patio` no badge da Portaria do Consolidado (apenas terceirizado).

### Mudanças em `src/hooks/useStatusPortariaPorCarga.ts`

- Estender o tipo:
  `EtapaPortaria = "aguardando" | "chegou" | "patio" | "carregando" | "expedido"`
- Atualizar `ORDEM` (chegou=1, patio=2, carregando=3, expedido=4)
- Adicionar label: `chegou: "Chegou — aguardando liberação"`
- Incluir `horario_chegada` no SELECT e na interface `MovRow`
- Reescrever `deriveEtapa`:

| Condição                                                                   | Etapa       |
|----------------------------------------------------------------------------|-------------|
| `tipo_movimento='saida'` OU `etapa_terceirizado='finalizado'` OU `horario_saida_final` | `expedido`  |
| `etapa_terceirizado='liberado'`                                            | `carregando`|
| `etapa_terceirizado='no_patio'` OU `horario_entrada` preenchido            | `patio`     |
| `etapa_terceirizado='chegada'` OU `horario_chegada` preenchido             | `chegou`    |
| (caso contrário)                                                           | `aguardando`|

Mantém a lógica de "etapa máxima" entre todos os movimentos da carga.

### Mudanças em `src/components/dashboard/PortariaStatusBadge.tsx`

- Adicionar entrada `chegou` no objeto `STYLE` com cor distinta (sugestão: âmbar suave / amarelo claro com ícone `BellRing` ou `LogIn`) para diferenciar visualmente de `aguardando` (cinza) e `patio` (azul).

### Carga própria

Sem alterações — fora de escopo, conforme combinado.

## Resultado

Fluxo terceirizado agora exibe corretamente: **Aguardando chegada → Chegou — aguardando liberação → No pátio → Carregando → Expedido**.
