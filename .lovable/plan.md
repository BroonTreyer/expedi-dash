## Problema

Ao clicar em **"Registrar"** no topo da Portaria → Varejo (`/portaria/carga-propria`) sem nenhum prefill (registro manual), o nome do motorista e a placa não aparecem depois de salvar — nem no Pátio Atual, nem em outros painéis.

## Causa raiz

No arquivo `src/components/portaria/RegistroMovimentoDialog.tsx`, na inicialização do diálogo (linha 137), quando não há prefill e `forcedCategoria === "carga_propria"`, o `tipo` é forçado para `"saida_rota"`:

```ts
setTipo(forcedCategoria === "carga_propria" ? "saida_rota" : "entrada");
```

Isso faz o formulário usar a matriz `VISIBILITY_SAIDA_ROTA` (`src/lib/portaria-fields-config.ts`), que mantém **placa, motorista e tipo_caminhao como `"oculto"`** — porque o desenho original presumia que a chegada já tinha sido registrada antes (via aba Esperados ou painel "Cargas fechadas aguardando veículo"), trazendo esses dados pelo prefill.

Resultado: no fluxo manual standalone os campos placa/motorista nunca são pedidos, o `INSERT` salva `placa = null, motorista = null` e o cartão no Pátio Atual mostra "—".

## Correção proposta

Tratar o caso "Registrar manual de Varejo sem prefill" como uma chegada+saída-p/-rota combinada, exigindo os dados de identidade do veículo.

### Mudança 1 — `src/components/portaria/RegistroMovimentoDialog.tsx`

Quando `!prefill && !prefillFromPlanilha && forcedCategoria === "carga_propria"`, manter `tipo = "entrada"` (em vez de `"saida_rota"`). Assim o formulário passa a usar a matriz `VISIBILITY` padrão, que para `carga_propria` já marca `placa`, `motorista`, `rota`, `km_inicial` e `foto_painel_saida_url` como obrigatórios (nasce direto em "em_rota" via lógica `isCargaPropriaPrimeiraSaida` já existente nas linhas 357–420).

A lógica de salvar (`isCargaPropriaPrimeiraSaida`) continua valendo: `tipo_movimento` é reescrito para `"entrada"` no payload, com `etapa_carga_propria = "chegou"` ou `"em_rota"` se a foto do painel/KM inicial vierem preenchidos. Nada muda na persistência.

### Mudança 2 — verificação de regressão

- Confirmar que abrir o diálogo via "Saída p/ Rota" no Pátio Atual continua usando `prefillEtapa = "saida_rota"` (esse caminho já preserva placa/motorista pelo prefill — linhas 79–94 — então não é afetado).
- Confirmar que abrir via aba Esperados continua passando pelo `openRegistroFromVeiculoEsperado` em `Portaria.tsx` (não usa este diálogo, usa `buildCargaPropriaPayload` direto — também não é afetado).

## Arquivo a alterar

- `src/components/portaria/RegistroMovimentoDialog.tsx` — ajustar a linha 137 para forçar `setTipo("entrada")` quando não houver prefill, mesmo para `carga_propria`.

## Validação

1. Em `/portaria/carga-propria`, clicar **Registrar** → diálogo deve mostrar os blocos **Veículo** (placa + motorista + tipo_caminhão) e **Operação** (rota, km_inicial, foto do painel).
2. Preencher placa "TEST123", motorista "João" e salvar.
3. O cartão deve aparecer no **Pátio Atual** mostrando placa e motorista corretamente.
4. Não deve mais aparecer o badge vermelho "Estado inconsistente" para registros recém-criados.
