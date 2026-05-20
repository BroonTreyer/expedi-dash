## Objetivo

Permitir que Admin/Logística/Portaria corrijam horários registrados na portaria (ex.: porteiro deu entrada no horário errado — Gladson entrou 08:37 e foi registrado em outro horário) diretamente pelo diálogo "Editar Movimento", sem precisar mexer no banco.

## Onde

`src/components/portaria/EditMovimentoDialog.tsx` — diálogo já usado em **Pátio Atual** e **Histórico** da Portaria (botão "Editar movimento"). RLS já permite UPDATE para admin/logística/portaria.

## O que muda

Adicionar uma seção **"Horários"** no diálogo, com inputs `datetime-local` (formato pt-BR `dd/MM HH:mm` na exibição auxiliar), mostrando apenas os campos relevantes ao tipo de movimento da linha:

- **Entrada (terceirizado)**:
  - Chegada na portaria (`horario_chegada`)
  - Liberação para o pátio (`horario_entrada`)
- **Entrada (carga própria)**:
  - Chegada (`horario_chegada` se houver) / Entrada no pátio (`horario_entrada`)
- **Saída / rota (carga própria)**:
  - Saída para rota (`horario_real_saida`)
  - Retorno (`horario_real_retorno`)
  - Saída final (`horario_saida_final`)
- **Saída (terceirizado)**:
  - Saída final (`horario_saida_final`)

Campos vazios continuam vazios; só são enviados ao UPDATE os que o usuário tocou.

## Validações (frontend, antes do save)

- `horario_entrada >= horario_chegada` (se ambos existirem).
- `horario_real_retorno >= horario_real_saida`.
- `horario_saida_final >= horario_entrada` (e >= `horario_real_retorno` quando houver).
- Nenhum horário no futuro além de 5 minutos de tolerância.
- Em caso de violação: `toast.error` explicando, sem salvar.

## Conversão

- Estado interno mantém ISO local (`yyyy-MM-ddTHH:mm`) para o input `datetime-local`.
- No save, converte para ISO com timezone (`new Date(local).toISOString()`) antes de enviar.
- Valor inicial: `format(new Date(movimento[campo]), "yyyy-MM-dd'T'HH:mm")` quando existir.

## Fora de escopo

- Não mexe em RLS, hooks ou em outros diálogos.
- Não recalcula derivados (tempo de espera/permanência) — eles são calculados em render a partir dos próprios campos, então passam a refletir o novo horário automaticamente.
- Não cria histórico/auditoria extra além do `audit_log` já existente para updates em `movimentacoes_portaria`.

## Como o usuário resolve o caso do Gladson

1. Portaria → aba **Pátio Atual** (ou Histórico se já saiu) → localiza a placa do Gladson → "Editar movimento".
2. Na seção "Horários", ajusta **Chegada / Liberação** para `08:37`.
3. Salvar → tempo de espera e permanência atualizam sozinhos.
