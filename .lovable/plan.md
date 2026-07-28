## Situação

O caminhão **RMB0C89 / WELLITON** está com dois registros de portaria em aberto no dia 25/07:

1. `d4b4c5bb…` — **carga_propria** vinculada à carga **CG-20260724-172416-L2G (ROBSON FOB)**, entrada em 25/07 12:25, `etapa_carga_propria = 'chegou'`, sem `horario_saida_final`. Este é o registro que o Consolidado mostra como **"No pátio"**.
2. `005b6b45…` — terceirizado sem carga_id, entrada 25/07 12:27 — este já foi finalizado hoje (28/07 11:32).

O carregamento (`carregamentos_dia`) já está com `status = 'Carregado'`, mas a portaria nunca registrou a saída, por isso o badge continua "No pátio" e não aparece opção de dar baixa (a tela onde você está — Consolidado — não expõe ação de portaria; a baixa é feita pela tela **Portaria — Carga Própria**, mas como está "FOB" e a etapa travou em `chegou`, o botão de conclusão sumiu para você).

## O que fazer

Dar baixa manual do movimento `d4b4c5bb-02d1-4d93-b839-e8e9a30bc129`:

- `etapa_carga_propria = 'finalizado'`
- `horario_saida_final = now()` (07:00 BRT do dia atual, ou o horário que você indicar)
- `horario_real_saida = now()`
- Inserir movimento espelho `tipo_movimento = 'saida'` na `movimentacoes_portaria` (mesmo padrão dos outros finalizados dele — ex.: `CG-20260710-163915-JG6`), para o Consolidado passar a exibir **"Expedido"**.

Depois disso o card do RMB0C89 sai de "No pátio" e entra como expedido normalmente.

## Confirmação necessária

Quer que eu use **o horário atual** como saída, ou algum horário específico (ex.: fim do carregamento em 25/07)?