## Problema

Ao clicar em **Registrar Chegada** na lista de **Esperados**, o toast de sucesso aparece (`"Chegada de XXX registrada! Aguardando liberação no pátio."`) e a movimentação é criada corretamente no Pátio (cartão laranja "Aguardando liberação"), **mas o veículo continua aparecendo na lista de Esperados**.

## Causa

No arquivo `src/pages/Portaria.tsx`, função `openRegistroFromVeiculoEsperado` (linhas 129-182), há um comentário explícito:

```
// NÃO marcar conferido aqui — só quando porteiro liberar entrada no pátio.
```

A lista de Esperados (`VeiculosEsperadosPanel`) filtra por `!v.conferido`. Como o registro `veiculos_esperados` nunca recebe `conferido = true` na ação de "Registrar Chegada", ele permanece visível indefinidamente. Comparando com `useRegistrarChegadaPortaria` (hook usado para walk-ins), aquele fluxo já marca `conferido: true` exatamente para o veículo sair da lista assim que a chegada é registrada.

## Correção

**Arquivo único: `src/pages/Portaria.tsx`** (handler `openRegistroFromVeiculoEsperado`):

1. Após o `createMov.mutateAsync(...)` ser bem-sucedido (tanto Carga Própria quanto Terceirizado), fazer um `UPDATE` em `veiculos_esperados` definindo:
   - `conferido: true`
   - `conferido_por: user?.id ?? null`
   - `conferido_em: new Date().toISOString()`

2. Após o update, invalidar as queries para o painel atualizar imediatamente:
   - `["veiculos_esperados"]`
   - `["veiculos_esperados_pendentes"]`
   - `["movimentacoes_portaria"]`

3. Remover/atualizar o comentário antigo ("NÃO marcar conferido aqui...") para refletir o novo comportamento: o veículo sai de Esperados assim que a chegada é registrada e passa a viver no Pátio (cartão laranja → azul → verde).

4. Manter o `try/catch` exibindo `e?.message` no toast de erro.

## Impacto

- **Comportamento visível:** clicar em Registrar Chegada → toast verde → linha desaparece de Esperados → cartão laranja "Aguardando liberação" aparece no Pátio (carga própria) ou cartão azul "No pátio" (terceirizado, dependendo da etapa).
- **Sem migração de banco**, sem mudança de RLS, sem mudança em hooks compartilhados.
- **Sem efeito retroativo**: registros já marcados continuam como estão.
- Mantém paridade total com o fluxo de walk-in (`useRegistrarChegadaPortaria`), que já funciona dessa forma.
