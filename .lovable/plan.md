## Problema

Quando uma carga é fechada, ela deveria aparecer primeiro no **card azul "Cargas Fechadas Aguardando Veículo"** (em `Portaria > Manual` e em `Expedição > PainelCargasFechadas`). Em vez disso, ela está caindo direto na lista de **"Esperados / A chegar"**.

## Causa raiz

O trigger de banco `on_carga_fechada` cria automaticamente um registro em `veiculos_esperados` (com `walk_in = false`, `status_autorizacao = 'previsto'`) toda vez que uma carga muda de etapa `vendas → logistica`.

O hook `useCargasFechadasAguardando` (em `src/hooks/useCarregamentos.ts`, linhas 489-499 e 555-556) filtra fora do card azul qualquer carga que já tenha um veículo previsto não-walk-in:

```ts
const cargasComVeiculoPrevisto = new Set(
  ((previstos ?? []) as ...[])
    .filter((v) => v.carga_id && !v.walk_in)
    .map((v) => v.carga_id as string)
);
...
if (cargasComVeiculoPrevisto.has(c.carga_id)) continue;
```

Como o trigger cria a previsão imediatamente, a carga "pula" o card azul e vai direto para Esperados.

Confirmado por consulta ao banco: cargas fechadas hoje (ex.: `DICKSON VANGUARDA`) já têm `veiculos_esperados` com `walk_in = false` criados no mesmo segundo.

## Correção (frontend, sem mexer no trigger)

Refinar a regra do hook `useCargasFechadasAguardando` para tratar a previsão automática como **complemento**, não como motivo de exclusão. A carga sai do card azul somente quando o veículo de fato chega ou entra — não apenas porque existe uma previsão.

### `src/hooks/useCarregamentos.ts` — `useCargasFechadasAguardando`

1. **Remover** o `Set cargasComVeiculoPrevisto` e o `continue` baseado nele (linhas ~489-500 e ~555-556).
2. Em vez disso, considerar que a carga **sai** do card azul apenas quando:
   - Já existe `movimentacao_portaria` finalizada (`finalizadaCarga`) — já tratado, mantém.
   - OU já existe entrada com `horario_entrada` preenchido (já está no pátio) — já tratado, mantém.
   - OU o `veiculo_esperado` correspondente já está marcado como `conferido = true` (chegou via fluxo de Esperados).
3. Buscar adicionalmente `conferido` na query de `previstos` e excluir só as cargas cujo veículo previsto já foi conferido.

Resultado: a carga aparece no card azul **assim que é fechada** (mesmo já tendo previsão automática), e desaparece dele somente quando o motorista efetivamente chega/entra. Idêntico ao comportamento anterior, agora compatível com o trigger automático.

### `src/components/expedicao/PainelCargasFechadas.tsx`

Já lê `chegouAguardandoLiberacao` corretamente. Nenhuma mudança necessária — funcionará automaticamente após a correção no hook.

### Painel "A chegar" (`PainelAChegar` / Esperados)

Hoje ele lista todos os `veiculos_esperados` não-conferidos. Com a correção, a carga aparece nos **dois** lugares (card azul "aguardando" + Esperados "a chegar") até a chegada — o que é o comportamento desejado pelo usuário (o card azul é o status visual claro do fechamento; Esperados é a fila operacional do porteiro).

## Fora do escopo

- Não alterar o trigger `on_carga_fechada` no banco (a previsão automática é útil para o fluxo de Esperados).
- Não alterar o hook `useVeiculosEsperados` nem os paineis de Pátio.
- Não tocar no fluxo já corrigido de "Registrar Chegada" (Esperados → INSERT direto).

## Validação após a mudança

1. Fechar uma carga terceirizada nova.
2. Conferir que ela aparece imediatamente no **card azul "Cargas Fechadas Aguardando Veículo"** (Expedição e Portaria).
3. Conferir que também aparece em **Esperados** (já era o comportamento atual).
4. Clicar em **Registrar Chegada** no Esperados → o card azul deve sumir e a carga deve aparecer no painel "Chegou" da Expedição.
