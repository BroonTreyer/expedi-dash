## Causa raiz

O Guilherme (carga 9466000, PRO0D73) saiu para rota em **28/05 05:47** e ninguém registrou retorno. Hoje é **05/06** — já passaram **8 dias**. O hook `useMovimentacoesAtivasPatio` (em `src/hooks/useMovimentacoesPortaria.ts`) tem uma janela fixa de **7 dias**:

```ts
const desde = new Date();
desde.setDate(desde.getDate() - 7);
```

Como a entrada dele é mais antiga que isso, o registro não entra no resultado, então:
- não aparece na aba **Pátio Atual** / **Cargas Fechadas Aguardando**,
- só sobra no **Histórico** (que usa intervalo de data manual),
- e não há onde clicar "Registrar Retorno" / "Saída Final", travando o fluxo.

O mesmo problema afeta qualquer carga própria/terceirizada cujo ciclo demore mais de 7 dias para fechar (como o caso de 30/04 RUBENS+FOCO já mapeado em memória).

## O que mudar

Arquivo único: `src/hooks/useMovimentacoesPortaria.ts`, função `useMovimentacoesAtivasPatio`.

1. **Ampliar a janela para registros ainda em aberto.** Em vez de cortar tudo em 7 dias, usar dois recortes:
   - Janela rápida de 7 dias para o comportamento atual (não muda nada já estável).
   - Segunda consulta complementar que busca **somente registros não finalizados** dos últimos **60 dias** (entradas `carga_propria` com `etapa_carga_propria` em `chegou|em_rota|retornou` ou `horario_saida_final IS NULL`; entradas `terceirizado` com `etapa_terceirizado != 'finalizado'` e sem saída vinculada).
   - Unir as duas listas (deduplicando por `id`) antes de aplicar o filtro já existente de `haCicloPosteriorFinalizado` / `saidasVinculadas`.

   Isso garante que o Guilherme volta a aparecer no painel "Cargas Fechadas Aguardando" / Pátio Atual sem precisar mudar UI, e os botões existentes ("Registrar Saída p/ Rota", "Registrar Retorno", "Saída Final / Lacre") voltam a funcionar normalmente.

2. **Marca visual de "atraso"** (opcional, leve): exibir um badge âmbar/vermelho discreto nos cards do pátio quando a entrada tiver mais de 24h sem evolução de etapa. Sem trocar layout — só um `<Badge variant="destructive">há Xd em aberto</Badge>` ao lado do nome do motorista. Implementado em `PatioAtualTab` e `CargasFechadasAguardandoPanel` reutilizando o helper de tempo já existente.

3. **Nenhuma alteração de schema, RLS ou edge function.** Tudo é leitura/UI.

## Fora do escopo (não mexer agora)
- Botão admin "Finalizar rota antiga" — fica para um segundo passo, só se ainda for necessário depois que o Pátio voltar a mostrar o registro.
- Alerta/notificação automática >24h — pode ser próximo passo, mas não é necessário para destravar o caso do Guilherme.

## Resultado esperado
- Guilherme volta a aparecer no Pátio Atual com badge "há 8d em aberto".
- Portaria consegue clicar em "Registrar Retorno" → preencher KM/lacre/foto → "Saída Final" normalmente.
- Qualquer outra rota antiga em aberto (até 60 dias) aparece junto, evitando registros fantasma.
