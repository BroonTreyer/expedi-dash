# Por que o SAMUEL ainda está aparecendo

**Causa raiz 1 — bug de fuso horário (código):**
Em `src/hooks/useCarregamentos.ts`, a função `dentroJanela` (linhas ~523-529) cria a janela de tempo com `new Date(\`${cargaData}T00:00:00\`)`, que o navegador interpreta como **horário local**. Em pt-BR (UTC-3), a janela da carga de `2026-05-13` vira `2026-05-12 15:00 UTC` → `2026-05-15 03:00 UTC`. A entrada real do SAMUEL ocorreu às `2026-05-12 12:51 UTC` (09:51 local) — **fica fora da janela por ~3h**. Resultado: o hook não casa o movimento com a carga, ignora o `horario_entrada` já preenchido e segue exibindo "Confirmar entrada do motorista".

**Causa raiz 2 — operacional (dado):**
O movimento `9c47876f...` (TFI2E43 / SAMUEL) tem `horario_entrada=2026-05-12 13:36`, `etapa_terceirizado=no_patio` e `horario_saida_final=NULL`. Ou seja, o motorista carregou e foi embora **sem registrar saída na portaria**, então mesmo após o fix do bug ele continuaria pendurado em "Pátio Atual".

# Plano

## 1. Corrigir o bug de fuso horário (`src/hooks/useCarregamentos.ts`)

Em `dentroJanela`, trocar a construção de data local por UTC para que a janela operacional case corretamente com `data_hora` (que vem em UTC do banco):

```ts
const dentroJanela = (cargaData: string, ts: string | null) => {
  if (!ts) return false;
  const base = new Date(`${cargaData}T00:00:00Z`).getTime(); // UTC
  const ini = base - 12 * 3600_000;
  const fim = base + 48 * 3600_000;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && t >= ini && t <= fim;
};
```

Efeito: a partir desse fix, qualquer carga cuja entrada já foi liberada (`horario_entrada` preenchido) sai automaticamente do painel "Cargas fechadas aguardando veículo".

## 2. Resolver o caso atual do SAMUEL (dado)

Como a saída nunca foi registrada, há duas opções — preciso da sua confirmação:

- **(a) Registrar a saída agora** no banco para o movimento `9c47876f-09e3-4b5f-8ff2-1a027ba536cd`: setar `horario_saida_final = horario_real_saida = now()` e `etapa_terceirizado = 'finalizado'`. Ele sai do painel e do Pátio Atual.
- **(b) Apenas finalizar a etapa** sem horário de saída real (caso você queira lançar manualmente outro horário depois pela tela de Portaria).

A opção (a) é a mais limpa e reflete a realidade ("ja carregou e foi embora").

## 3. Validação
- Recarregar `/portaria/registro-entrada` e confirmar que o card "SAMUEL" sumiu.
- Conferir que outras cargas legítimas (que ainda não tiveram entrada liberada) continuam aparecendo normalmente.

# Pergunta antes de implementar
Confirma que pode marcar a saída do SAMUEL com `now()` (opção **a**)? Ou prefere registrar a saída manualmente pela tela depois (opção **b**, só aplico o fix de código)?
