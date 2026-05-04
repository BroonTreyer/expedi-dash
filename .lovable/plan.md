## Problema

Na aba **Esperados** de `/portaria/carga-propria`, ao clicar em **"Registrar Chegada"** o veículo NÃO aparece no Pátio nem no painel azul "Aguardando liberação" — vai direto para o **Histórico**.

## Causa raiz

Fluxo atual em `Portaria.tsx → openRegistroFromVeiculoEsperado` (linhas 129‑190):

1. Cria uma `movimentacoes_portaria` com:
   - `tipo_movimento: "entrada"`
   - `categoria: "carga_propria"`
   - `etapa_carga_propria: "aguardando_liberacao"`
   - `horario_chegada: agora`
   - **`horario_entrada: null`** ← o veículo ainda não foi fisicamente liberado para o pátio

2. Marca o `veiculo_esperado` como **conferido = true** (sai da aba Esperados).

Onde isso quebra:

- **Aba Pátio Atual** (`useMovimentacoesAtivasPatio`, linha 204):
  ```
  if (categoria === "carga_propria" && etapa === "aguardando_liberacao" && !horario_entrada) return false;
  ```
  → o movimento é EXPLICITAMENTE excluído. Correto: ele deveria estar no painel azul.

- **Painel azul "Aguardando vínculo / liberação"** (`CargasFechadasAguardandoPanel`):
  Esse painel parte de `carregamentos_dia` filtrado por `etapa = 'logistica'` e cruza com a movimentação pelo `carga_id`. Funciona para cargas fechadas pela Logística. **Não funciona** quando:
  - o veículo esperado não tem `carga_id`, OU
  - a carga não está em `etapa = 'logistica'`, OU
  - foi importado via planilha sem vincular a uma carga real.

- **Histórico** (`HistoricoTab`): mostra todos os movimentos do período sem filtro — então o registro acaba "aparecendo só lá".

Resultado: se o `veiculo_esperado` não tem carga fechada correspondente em `carregamentos_dia`, a chegada vira invisível em Pátio E em Aguardando, sobrando só no Histórico.

## Correção

A intenção do código é clara: **chegada registrada (sem entrada física) = painel azul "Aguardando liberação"**. Como o painel azul não cobre o caso "esperado sem carga fechada", precisamos exibir esses movimentos pendentes em algum lugar **ativo**, não no Histórico.

A solução mínima e segura é incluir movimentos "aguardando liberação sem `horario_entrada`" no **Pátio Atual** como cartão laranja "Aguardando liberar entrada", em vez de escondê-los. Hoje o filtro já tem o ramo de exclusão em `useMovimentacoesAtivasPatio`; basta inverter para **incluir** quando não há painel azul cobrindo aquele movimento.

### Mudança 1 — `src/hooks/useMovimentacoesPortaria.ts` (linhas 200‑204)

Remover as duas linhas que descartam chegadas sem `horario_entrada` do Pátio Atual:

```ts
// Antes:
if (m.categoria === "terceirizado" && m.etapa_terceirizado === "chegada" && !m.horario_entrada) return false;
if (m.categoria === "carga_propria" && m.etapa_carga_propria === "aguardando_liberacao" && !m.horario_entrada) return false;

// Depois: removidas. O Pátio Atual passa a manter esses movimentos visíveis
// para que a portaria possa liberar a entrada também a partir da aba Pátio,
// não só do painel azul.
```

### Mudança 2 — `src/components/portaria/PatioAtualTab.tsx` (renderização do cartão)

Garantir que, quando `!horario_entrada`, o cartão mostre badge laranja **"Aguardando liberar entrada"** e botão **"Liberar entrada no pátio"** (que apenas faz `UPDATE movimentacoes_portaria SET horario_entrada = now()` no movimento). Verificar o componente — se o botão já existe para outra finalidade, reaproveitar; senão, adicionar bloco condicional simples.

Plano de inspeção rápida na implementação:
- Ler `PatioAtualTab.tsx` para ver se já trata o estado `!horario_entrada`.
- Se já trata (provavelmente sim para o caso vinculado a carga via painel azul), nada a fazer aqui.
- Se não trata, adicionar a condição com o mesmo handler usado no painel azul (`useLiberarEntradaPatio` ou equivalente — confirmar nome do hook na hora).

### Mudança 3 — Sem alterações em `Portaria.tsx`

O `openRegistroFromVeiculoEsperado` já cria o movimento corretamente. Não muda.

## Resultado esperado

1. Em Esperados → clicar **Registrar Chegada**: o veículo sai de Esperados, aparece no **Pátio Atual** com badge laranja "Aguardando liberar entrada".
2. Quando a portaria libera, o cartão vira verde (entrada confirmada).
3. Para cargas que JÁ estão fechadas pela Logística com `carga_id` válido, ele continua aparecendo também no painel azul "Cargas fechadas aguardando" — comportamento atual preservado.
4. Histórico passa a mostrar apenas o que faz sentido (movimentos do período, incluindo os que ainda estão ativos), sem "vazar" como único local visível.

## Arquivos

- `src/hooks/useMovimentacoesPortaria.ts` — remover as duas linhas de exclusão.
- `src/components/portaria/PatioAtualTab.tsx` — verificar/ajustar render do cartão "aguardando liberar entrada" (se necessário).
