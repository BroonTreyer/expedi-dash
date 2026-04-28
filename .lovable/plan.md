# Restaurar pedido #13 — FRIGORSUL / Ubatã-BA (EDIVAR)

## Contexto
O pedido foi **excluído manualmente** em 28/04 às 14:05 por `faturamento@frico.ind.br`. Os snapshots completos das 2 linhas estão preservados em `audit_log.changes.deleted_row`.

## O que será restaurado
Reinserção dos 2 itens originais na tabela `carregamentos_dia`, com os mesmos IDs e dados originais:

| Pedido | Cliente | Cidade | Produto | Qtd | Peso |
|---|---|---|---|---|---|
| #13 | FRIGORSUL TRANSPORTES E DISTRIBUIDORA (33175) | Ubatã-BA | LINGUIÇA TOSCANA MISTA 4x5kg | 50 | 1.000 kg |
| #13 | FRIGORSUL TRANSPORTES E DISTRIBUIDORA (33175) | Ubatã-BA | LING SUÍNA FINA APIMENTADA CL 4x4,5kg | 56 | 1.008 kg |

Vendedor: **EDIVAR** · Data: **28/04/2026** · Etapa: **vendas** · Status: **Aguardando** · Tipo Frete: **FOB** · `peso_manual: true`

## Implementação técnica
Migração SQL com `INSERT ... ON CONFLICT (id) DO NOTHING` reusando os UUIDs originais (`82d3c85a-...` e `accab9b5-...`), preservando `peso_original`, `quantidade_original`, `numero_pedido = 13` e `vendedor_id` originais. Após o INSERT, o trigger `audit_carregamentos` registrará automaticamente a ação `criado` no log, deixando rastro da restauração.

## Riscos
Nenhum — IDs únicos não conflitam (já foram deletados); `ON CONFLICT DO NOTHING` é idempotente caso você execute novamente por engano.
