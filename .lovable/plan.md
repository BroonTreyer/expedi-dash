
User quer que o botão "Chegada sem previsão" saia de dentro das telas de Portaria (Carga Própria / Terceirizado) e vire um item de **menu lateral**, acessível diretamente.

## Plano

### 1. Nova rota dedicada
Criar `src/pages/ChegadaSemPrevisao.tsx`:
- Página simples com header "Chegada sem previsão" + descrição.
- Dois botões grandes (cards): **"Frota Própria"** e **"Terceirizado"** → cada um abre o `RegistroChegadaWalkInDialog` já existente passando o `grupo` correspondente.
- Abaixo, embute o `SolicitacoesPendentesPanel` para o porteiro acompanhar o status das solicitações que acabou de enviar e logística aprovar/recusar no mesmo lugar.

### 2. Menu lateral (`src/components/AppSidebar.tsx`)
Dentro do grupo **Portaria**, adicionar novo leaf:
- `{ to: "/portaria/chegada-sem-previsao", label: "Chegada sem previsão", icon: AlertCircle, roles: ["admin","logistica","portaria"] }`
- Posicionar logo após "Terceirizados".

### 3. Rota (`src/App.tsx`)
- Adicionar lazy import e `<Route path="/portaria/chegada-sem-previsao">` protegido para `admin/logistica/portaria`.

### 4. Remover botão das páginas atuais
Em `src/pages/Portaria.tsx` (usado por Carga Própria e Terceirizado): remover o botão "Chegada sem previsão" e o estado/dialog associado. O `SolicitacoesPendentesPanel` no topo pode permanecer (continua útil para a logística ver solicitações pendentes do dia), OU mover só para a nova página — vou **manter** no topo da Portaria também, pois a logística precisa ver mesmo sem entrar na nova tela. Apenas o **botão de criação** sai.

### Arquivos
- 🆕 `src/pages/ChegadaSemPrevisao.tsx`
- ✏️ `src/components/AppSidebar.tsx` (item de menu)
- ✏️ `src/App.tsx` (rota)
- ✏️ `src/pages/Portaria.tsx` (remover botão)

### Sem mudanças em
- Banco, hooks, RLS, dialog walk-in, painel de pendentes.
