## Objetivo

Permitir dar baixa em massa (ou individualmente) nos registros antigos de **Varejo / Carga Própria** que estão travados no Pátio Atual em "Em Rota", "Chegou" ou "Estado inconsistente", sem precisar preencher KM, foto ou horário de retorno.

## Onde

Adicionar um terceiro card no `PortariaAdminPanel` (já existe em `/portaria-admin`, ao lado de "Movimentações Fantasma" e "Veículos Esperados Antigos"), chamado **"Carga Própria travada no pátio"**.

## Como funciona

- Lista todas as movimentações com `categoria = 'carga_propria'` que ainda **não foram finalizadas** (`etapa_carga_propria IN ('chegou','em_rota','retornou')` ou nulo, e `horario_saida_final IS NULL`) e cuja `data_hora` (ou `horario_real_saida`) seja anterior a um limite configurável.
- Limite padrão: **24 horas**. Seletor rápido no header do card: 24h / 48h / 72h / 7 dias.
- Cada linha mostra: placa (ou "—"), motorista, rota, etapa atual (badge) e há quanto tempo está aberto.
- Botão por linha **"Dar baixa"** e botão no header **"Dar baixa em todos"** (com confirmação `AlertDialog`, igual aos outros cards).

## O que a "baixa" faz

UPDATE na `movimentacoes_portaria` setando:

- `etapa_carga_propria = 'finalizado'`
- `horario_saida_final = now()` (e também `horario_real_retorno = now()` se ainda for nulo, para os relatórios fecharem o ciclo)
- `observacoes` recebe append: `"[Baixa administrativa - registro antigo sem dados]"`

Não preenche KM final, foto, nem nada que dependa do motorista. O registro sai do Pátio Atual e dos KPIs de "No Pátio", e fica disponível no Histórico marcado como finalizado por admin.

## Detalhes técnicos

- Arquivo único alterado: `src/components/portaria/PortariaAdminPanel.tsx`.
- Nova `useQuery(["admin-cargas-proprias-travadas", limiteHoras])` e duas mutations (`finalizarUmaCargaPropria`, `finalizarTodasCargasProprias`), seguindo exatamente o padrão das mutations existentes (toast + invalidate de `movimentacoes-portaria`).
- Invalidar também `["motoristas-painel"]` para o painel de motoristas atualizar.
- Sem migração de banco — só UPDATE via cliente, RLS já permite admin/logística editar `movimentacoes_portaria`.
- Sem mudança em telas de Portaria/Pátio Atual — a baixa em massa fica concentrada no painel admin para evitar uso acidental.

## Validação

1. Acessar `/portaria-admin` como admin.
2. O novo card mostra os registros da imagem (OMN3I28 155h, EFO0D46 133h, etc.).
3. Clicar "Dar baixa em todos" com janela de 24h → confirma → todos somem do Pátio Atual de Varejo e aparecem como finalizados no Histórico.
4. KPIs "No Pátio" e "Em Rota" do painel de Varejo zeram para esses registros antigos.
