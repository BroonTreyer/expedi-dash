# Carga da MOISA desapareceu ao marcar como carregando

## O que aconteceu (confirmado no banco)

A carga **MOISA** (`CG-20260807-082937-2QI`, NELSON JUNIO / RNZ6B98, 40 pedidos) existe e está intacta — ela só saiu da tela.

- Ela nasceu como pré-carga `PRE-20260804-164347-T8W` e foi fechada hoje (07/08 às 11:29): o registro de auditoria mostra apenas a troca de `carga_id` e de etapa (`pre_carga` → `logistica`).
- O campo de data dos pedidos continuou **15/07/2026** (data original dos pedidos), não a data do fechamento.
- Às 14:17 os itens passaram para Carregando/Carregado.

O painel do dia carrega os pedidos de hoje **mais** os pedidos atrasados dos últimos 30 dias, mas apenas os que **não** estão "Carregado". Como a carga ficou com data 15/07 e passou a Carregado, ela deixou de atender às duas condições e desapareceu da tela — sem nenhum dado ter sido perdido.

## Correções

1. **Dados desta carga:** ajustar a data dos 40 pedidos da MOISA para 07/08/2026 (dia do fechamento), fazendo a carga voltar a aparecer imediatamente.

2. **Causa raiz — fechamento por vínculo de veículo/pré-carga:** quando uma pré-carga é promovida para carga definitiva, passar a atualizar também a data para o dia do fechamento (quando a data atual for anterior a hoje). O fechamento em lote normal já faz isso; esse caminho não fazia.

3. **Rede de segurança na visibilidade:** no painel do dia, manter visíveis as cargas atrasadas mesmo com status Carregado enquanto a portaria não tiver registrado a saída — mesma exceção que a tela de Consolidado já aplica. Assim, marcar "Carregando/Carregado" nunca faz uma carga sumir antes de ser expedida.

## Detalhes técnicos

- `src/hooks/useCarregamentos.ts` → `promoverPreCargaSeNecessario()`: incluir `data` (hoje) no update de `carregamentos_dia` quando a data atual for anterior a hoje.
- `src/hooks/useCarregamentos.ts` (query principal, filtro `data.eq/…status.neq.Carregado`): incluir também as cargas dos últimos 30 dias com status Carregado que ainda não têm `horario_saida_final` em `movimentacoes_portaria`, replicando a lógica já usada em `src/pages/Consolidado.tsx`.
- Ajuste pontual de dados: `UPDATE carregamentos_dia SET data = '2026-08-07' WHERE carga_id = 'CG-20260807-082937-2QI'`.