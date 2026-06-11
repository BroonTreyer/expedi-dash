## Problema

No `RegistroMovimentoDialog.tsx` (linhas 425-430), quando um veículo Terceirizado registra entrada, o sistema preenche `horario_entrada` imediatamente e seta `etapa_terceirizado = "no_patio"`, pulando a etapa de "Aguardando liberação". Isso contradiz o fluxo documentado (memória `portaria-third-party-workflow`) e o que o `RegistroEntradaDialog.tsx` já faz corretamente.

Resultado: Gustavo aparece direto como "No Pátio" assim que a portaria registra a chegada, sem passar pelo passo de liberação.

## Correção

**`src/components/portaria/RegistroMovimentoDialog.tsx`** — Trocar o bloco terceirizado/entrada para o fluxo de duas etapas:

```ts
...(categoria === "terceirizado" && tipo === "entrada" ? {
  horario_chegada: new Date().toISOString(),
  horario_entrada: null,
  etapa_terceirizado: "chegada",
} : {}),
```

Assim o registro nasce como "Aguardando liberação" e só vira "No Pátio" quando alguém clica em "Liberar entrada" no `CargasFechadasAguardandoPanel` / `PatioAtualTab` (que já fazem o UPDATE setando `horario_entrada = now()` e `etapa_terceirizado = 'no_patio'`).

Nenhuma mudança de schema, RLS, ou de outros componentes — apenas o estado inicial do INSERT.

## Verificação

- Registrar chegada de um terceirizado pela portaria → deve aparecer em "Aguardando liberação" (não em "Pátio Atual").
- Clicar "Liberar entrada" → move para "No Pátio" com `horario_entrada` preenchido.
- Fluxos de carga própria e saída permanecem inalterados.