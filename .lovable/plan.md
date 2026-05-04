## Problema

Você finalizou o motorista RODRIGO / placa CZC2919, mas ele continua aparecendo no Pátio Atual com o botão "Saída p/ Rota".

## Diagnóstico

Verifiquei no banco — o registro de hoje **está corretamente finalizado**:

```
id: c1e39823...
etapa_carga_propria: finalizado
horario_saida_final: 04/05 12:39
```

O bug está no filtro do front-end (`src/hooks/useMovimentacoesPortaria.ts`, função `useMovimentacoesAtivasPatio`).

Ele foi escrito antes da Onda 4, quando Carga Própria às vezes era criada como `tipo_movimento='saida'`. A Onda 4 normalizou tudo para `'entrada'` (155 registros migrados). Agora todo CP é `entrada`, mas o filtro só checa `etapa_carga_propria === 'finalizado'` no ramo de `saida` (linha 207-211). No ramo de `entrada` (linha 213-220), ele só barra `terceirizado` finalizado — esquece a Carga Própria.

Resultado: registro de Carga Própria entra como `entrada`, é finalizado, mas o filtro nunca vê o "finalizado" e continua mostrando no pátio.

## Correção

Adicionar duas verificações no ramo de entrada do filtro:

```ts
// Carga Própria finalizada não deve aparecer no pátio
if (m.categoria === "carga_propria" && m.etapa_carga_propria === "finalizado") return false;
// Defesa extra: horario_saida_final preenchido também encerra o ciclo
if (m.categoria === "carga_propria" && m.horario_saida_final) return false;
```

Também atualizar o comentário do ramo legado de `saida` para deixar claro que é defesa pós-Onda 4.

## Arquivos afetados

- `src/hooks/useMovimentacoesPortaria.ts` — adicionar 2 linhas no filtro de `useMovimentacoesAtivasPatio` (linhas 215-220).

## Validação

- Após o deploy, abrir `/portaria/carga-propria` → o registro do RODRIGO/CZC2919 desaparece da aba Pátio.
- Outros veículos com CP em etapa `chegou`, `em_rota` ou `retornou` continuam visíveis (não foram afetados).
- KPI "No Pátio" da Carga Própria diminui em 1.

## Por que escapou da Onda 4

A Onda 4 testou a finalização via banco (etapa correta + `horario_saida_final` preenchido) e via FSM (transição válida). Não testou o caminho de leitura subsequente — o filtro do Pátio Atual ainda assumia o shape antigo. Vou marcar isso no plan.md como lição para a próxima onda: "filtros de leitura também precisam ser revisados quando o shape de criação muda".
