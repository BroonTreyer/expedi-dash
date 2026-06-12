## Contexto

Na Portaria de Distribuidores há dois problemas:

1. O time da Portaria está clicando em **"Registrar Chegada"** dentro do painel **Veículos Esperados** e pulando o fluxo oficial (cards vermelho "Aguardando vínculo" no Pátio Atual e cards azuis "Cargas fechadas aguardando veículo"). Isso gera registros sem vínculo correto.
2. O motorista **Rodrigo** aparece **3 vezes** simultaneamente — em "No Pátio", em "Aguardando vínculo" (card vermelho do Pátio Atual) e ainda na lista. Veículo que não está fisicamente no pátio não pode aparecer como se estivesse.

## Mudanças

### 1. `src/components/portaria/VeiculosEsperadosPanel.tsx` — esconder "Registrar Chegada" para Portaria

- Adicionar prop opcional `hideRegistrarChegada?: boolean`.
- Quando `true`, não renderiza o botão **"Registrar Chegada"** (nem no mobile/cards nem na tabela desktop). O painel continua sendo só consulta/programação: ver previstos, atrasados, conferidos, e a Logística/Admin pode excluir/limpar.

### 2. `src/pages/Portaria.tsx` — passar a flag para o painel

- Calcular `hideRegistrarChegada = role === "portaria"` (Admin e Logística continuam podendo registrar pelo painel se quiserem; a Portaria é forçada a usar os cards).
- Passar para `<VeiculosEsperadosPanel ... hideRegistrarChegada={...} />`.

### 3. `src/components/portaria/PatioAtualTab.tsx` — deduplicar veículos por placa

Hoje a lista `veiculosNoPatio` pode trazer dois registros do mesmo motorista:
- um cartão **vermelho** "Aguardando vínculo" (terceirizado em `etapa_terceirizado='chegada'` sem `carga_id`), e
- um cartão **normal** "No Pátio" (entrada com `horario_entrada` preenchido) criada antes (ex.: registrada via Esperados).

Adicionar dedupe por **placa normalizada** após o filtro principal:

- Agrupar `veiculosNoPatio` por `placa.trim().toUpperCase()`.
- Para cada grupo com mais de 1 registro, manter **apenas o mais recente que represente o estado físico real do pátio**, com a seguinte prioridade:
  1. Registro com `horario_entrada` preenchido e não finalizado (= está fisicamente no pátio).
  2. Se nenhum tiver `horario_entrada`, manter o "Aguardando vínculo" mais recente.
- Registros sem placa (raros) seguem sem dedupe.

Resultado: se Rodrigo já entrou no pátio (tem `horario_entrada`), o card vermelho "Aguardando vínculo" daquele mesmo motorista deixa de ser exibido — fica só o card real do pátio. Inversamente, se ainda não entrou, mostra só o vermelho.

### 4. Espelhar a mesma dedupe no contador de `counts.patio` em `src/pages/Portaria.tsx`

Para o badge da aba "Pátio" não divergir da lista renderizada, aplicar a mesma regra de dedupe por placa antes de contar.

## Fora de escopo

- Não alteramos schema, RLS, nem lógica do painel azul (`CargasFechadasAguardandoPanel`).
- Não mexemos no fluxo de Admin/Logística no painel Esperados — apenas a Portaria perde o botão.
- Não removemos registros antigos duplicados do banco; a dedupe é visual. Se quiser limpeza histórica, faço em passo separado.
