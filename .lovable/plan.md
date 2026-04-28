## Diagnóstico confirmado

Linha do tempo do item **CALABRESA 4x2,5kg / pedido #1** (mesma timeline para todos os 30+ itens das cargas afetadas):

| Quando | Quem | O que mudou |
|---|---|---|
| 27/04 18:43 | faturamento@frico.ind.br | Criou pedido com **peso = 1000 kg** |
| 27/04 19:34 | logistica@frico.ind.br | Vinculou à carga "CEARA DOM EL. + ACAILANDIA" |
| 28/04 13:52 | faturamento@frico.ind.br | Mudou para "Pronto para carregar" |
| **28/04 14:15** | **logistica@frico.ind.br** | **Alterou peso de 1000 → 40 kg** |
| 28/04 17:59 | matheuscarneiro004@ | Ajustou apenas transportadora |

**Causa**: o usuário logística@ editou um campo no diálogo da carga e a regra de cascata multi-item ("Multi-item edits cascade to sibling records") propagou o peso `40` para **todos os 38 itens** das três cargas relacionadas (`CEARA DOM EL. + ACAILANDIA`, `CEARA DOM EL+ ACAILANDIA`, `ACAILANDIA & DOM ELIZEU`). Os 91 demais itens nunca tiveram peso = 40 (esses estão íntegros).

**Pesos reais perdidos** (amostra do que será restaurado):
- CALABRESA 4x2,5kg → 1.000 kg
- LINGUIÇA TOSCANA FRANGO → 2.500 kg
- PRESUNTO 2x3,4kg → 1.020 kg
- LANCHE 4x3,6kg → 720 kg
- MORTADELA MINI TRAD → 176,4 kg
- ... (38 itens no total)

## Plano de restauração

### Passo 1 — Snapshot de segurança
Antes de qualquer alteração, criar um snapshot completo (`data_snapshots`) com a descrição: *"Pré-restauração de pesos cargas CEARA DOM EL/ACAILANDIA (28/04)"*. Isso permite rollback caso algo dê errado.

### Passo 2 — Restaurar pesos via audit log
Para cada item dessas 3 cargas onde `peso = 40`:
1. Buscar no `audit_log` o registro `action = 'criado'` desse `entity_id`.
2. Extrair `changes -> 'novo' -> 'peso'` (peso original do momento da criação).
3. Restaurar: `UPDATE carregamentos_dia SET peso = <peso_original>, peso_original = <peso_original>, ruptura_sinalizada = false WHERE id = ...`.

Casos especiais:
- Itens cujo peso original já era 40 (ex.: `INGREDIENTES P/ FEIJOADA`, `LINGUICA SUINA C/CH. VD APIM. BAND CONG`) ficam intactos — eram 40 mesmo.
- Itens dos pedidos #67, #68 (PAO DE ALHO em UNID) tinham peso original = 4 (peso real). Restaurar para 4.
- Itens de outras cargas com `peso = 40` que NÃO estão nessas 3 cargas afetadas não serão tocados.

### Passo 3 — Reset do trigger `ruptura_sinalizada`
Como o peso vai voltar a ser igual a `peso_original`, o flag `ruptura_sinalizada` (que estava marcando "ruptura parcial" falsa) será removido na mesma operação.

### Passo 4 — Auditoria pós-restauração
Inserir registro manual no `audit_log` para cada item restaurado descrevendo: *"Restauração automática via plano: peso 40 → X kg (valor original do pedido). Causado por edição em massa indevida em 28/04 14:15-14:27."* Isso preserva rastreabilidade total.

### Passo 5 — Verificação visual
Após restauração, recarregar o Dashboard e o Consolidado para confirmar:
- Peso da carga `CEARA DOM EL. + ACAILANDIA` deve voltar a aproximadamente 17.000+ kg (não 1.388 kg).
- Badge "kg cortados" deve sumir (não há mais ruptura parcial).
- Os 2 veículos da tela devem mostrar o peso real da expedição.

## Implementação técnica

Como é uma operação de UPDATE em massa baseada em consulta a outra tabela, será feita via **edge function `restore-weights-from-audit`** (one-shot, removida após uso) com:
- Validação de JWT (apenas admin).
- Service role para ler audit_log e atualizar carregamentos_dia.
- Filtro restrito às 3 `carga_id`s específicas (hardcoded para evitar acidente).
- Dry-run mode primeiro (retorna lista do que SERÁ alterado).
- Apply mode segundo (executa após confirmação).
- Snapshot automático antes do apply.

## Arquivos afetados

- `supabase/functions/restore-weights-from-audit/index.ts` — função one-shot de restauração.
- Snapshot inserido em `data_snapshots`.
- ~38 linhas atualizadas em `carregamentos_dia`.
- ~38 linhas inseridas em `audit_log` (rastro da restauração).

## Riscos e mitigação

- **Risco**: alguma edição legítima de peso ter ocorrido entre a criação e o "achatamento" das 14:15. **Mitigação**: a função vai reconstruir o peso pegando o ÚLTIMO `audit_log.changes.peso.de` antes do registro de 14:15-14:27 (e não o "criado"), garantindo que pegamos o valor imediatamente anterior à corrupção.
- **Risco**: o usuário ter realmente querido marcar peso = 40 em algum item específico. **Mitigação**: dry-run mostra a lista completa antes de aplicar; você confirma item por item se necessário.
- **Risco**: outras cargas terem o mesmo problema. **Mitigação**: depois desta restauração, rodo uma query global para detectar outros padrões de "muitos itens de uma carga com mesmo peso suspeito" e te apresento.

## Próximos passos sugeridos (não inclusos neste plano, mas recomendados)

Em conversa separada, podemos: (a) endurecer o diálogo de edição de carga para exigir confirmação explícita "Aplicar a TODOS os N itens?"; (b) bloquear cascata de `peso` (deixar cascata só para campos de identidade/logística como placa, motorista, transportadora — nunca pra peso/quantidade).
