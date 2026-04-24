

## Renomear "Walk-in" para termos em português na Portaria

### Diagnóstico
O termo técnico **"Walk-in"** aparece em vários pontos da interface da Portaria (badges, botões, títulos, mensagens). O pessoal da portaria não entende esse jargão. Precisa ser substituído por linguagem clara em português.

### Tradução proposta
| Termo atual | Substituição |
|---|---|
| "Walk-in" (badge/título) | **"Sem agendamento"** |
| "Walk-in autorizado" | **"Motorista já no pátio"** |
| "Confirmar entrada do walk-in" | **"Confirmar entrada do motorista"** |
| "Solicitação walk-in" / "Veículo walk-in" | **"Chegada sem agendamento"** |
| "Vincular walk-in a carga" | **"Vincular motorista à carga"** |
| "Aguardando vínculo (walk-in)" | **"Aguardando vínculo de carga"** |

> Observação: o nome técnico do **campo no banco** (`walk_in`, `useVeiculosWalkInAtivos`, etc.) **não muda** — só os textos visíveis ao usuário. Isso evita migração e mantém o código estável.

### Arquivos a alterar (apenas strings de UI)

1. **`src/components/portaria/CargasFechadasAguardandoPanel.tsx`**
   - Badge "Walk-in autorizado" → "Motorista já no pátio"
   - Botão "Confirmar entrada do walk-in" → "Confirmar entrada do motorista"
   - Texto helper "Motorista já está no pátio" → manter

2. **`src/components/portaria/SolicitacoesPendentesPanel.tsx`**
   - Título do card / cabeçalho com "Walk-in" → "Chegadas sem agendamento"
   - Badges/labels internos

3. **`src/components/portaria/VincularCargaDialog.tsx`**
   - Título e descrição com "walk-in" → "motorista sem agendamento"

4. **`src/components/portaria/RegistroEntradaDialog.tsx`**
   - Toasts e labels que mencionem "walk-in" → "sem agendamento" / "motorista"

5. **`src/pages/RegistroEntrada.tsx`**
   - Cabeçalhos e textos descritivos que tenham "Walk-in"

6. **`src/components/NotificationBell.tsx`** (se aplicável)
   - Textos de notificação tipo "Novo walk-in" → "Nova chegada sem agendamento"

7. **`src/components/portaria/PortariaKpiCards.tsx`** (se houver KPI mencionando)
   - Label de KPI

### Como vou descobrir todas as ocorrências
Vou rodar `code--search_files` por `walk-in|walk_in|Walk-In|WalkIn` (case-insensitive) **apenas em strings JSX/labels** (ignorando nomes de variáveis, hooks e queryKeys). Cada ocorrência será trocada pelo termo em português equivalente da tabela acima.

### Fora do escopo
- Renomear hooks (`useVeiculosWalkInAtivos`), tabelas, colunas (`walk_in`), `queryKey` ou tipos TS — mantêm o nome técnico.
- Mudar lógica de funcionamento — só texto.
- Outras telas fora da Portaria.

### Validação
1. `/portaria/registro-entrada`: nenhum texto visível contém "walk-in".
2. Card vermelho passa a se chamar "Chegadas sem agendamento".
3. Card azul mostra "Motorista já no pátio" quando aplicável, com botão "Confirmar entrada do motorista".
4. Diálogo de vincular: "Vincular motorista à carga".
5. Notificações realtime sem o termo em inglês.

### Resultado
Interface 100% em português operacional, compreensível para o time da portaria, sem risco de regressão (nenhuma mudança de lógica/banco).

