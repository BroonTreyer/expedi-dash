# Corrigir quitação da ALVORADA (OC 132724)

## O que está errado (confirmado no banco)

A OC 132724 tem **dois adiantamentos** para o mesmo frete, criados com 10 minutos de diferença em 17/08:

| Adiantamento | CT-es vinculados | Valor frete | Adt (80%) | Saldo | Status |
|---|---|---|---|---|---|
| ADT-20260817-001 | **nenhum** (registro órfão) | 3.964,34 | 3.171,47 | 792,87 | pago |
| ADT-20260817-002 | CT-e 3232 | 3.964,34 | 3.171,47 | 792,87 | pago |

Só existe **um** CT-e 3232 (R$ 3.964,34, 3.221,6 kg) — não houve duplicidade de CT-e. O problema é o adiantamento ADT-20260817-001, que ficou sem nenhum CT-e vinculado e continua somando na OC. Por isso o sistema mostra o dobro (R$ 1.585,74 de saldo e R$ 6.342,94 de adiantamento) em vez de R$ 792,87 / R$ 3.171,47.

## Correção dos dados

- Cancelar o ADT-20260817-001 (status `cancelado`, com observação registrando que era duplicata sem CT-e vinculado da OC 132724). Não gera crédito a recuperar caso o pagamento real tenha saído apenas uma vez; se a Alvorada recebeu os dois adiantamentos, o valor entra como crédito a recuperar de R$ 3.171,47 — confirmar antes.
- Resultado: OC 132724 passa a mostrar frete total 3.964,34, adiantamento pago 3.171,47 e **saldo a quitar 792,87**, igual ao texto da Alvorada.

## Prevenção

1. **Bloquear adiantamento sem CT-e:** ao gerar um adiantamento, exigir pelo menos um CT-e vinculado; se a gravação do vínculo falhar, o cabeçalho não é criado (ou é desfeito).
2. **Bloquear duplicata por OC:** antes de criar, verificar se já existe adiantamento ativo (não cancelado) para a mesma Ordem de Carga + transportadora com os mesmos CT-es, e avisar/bloquear.
3. **Painel de auditoria:** incluir na aba de Adiantamentos um aviso para adiantamentos com `qtd_ctes` maior que a quantidade de vínculos reais (órfãos), para varrer casos antigos.
4. **Aviso na quitação:** no diálogo de Registrar Quitação, alertar quando a OC tiver dois adiantamentos de valor idêntico ou um adiantamento sem CT-e listado.

## Detalhes técnicos

- Dados: `UPDATE adiantamentos_frete SET status='cancelado', observacoes=...` no registro `bf2485aa-...`; sem exclusão física, preservando trilha de auditoria.
- `src/hooks/useAdiantamentos.ts`: criação em transação lógica (insert do cabeçalho + vínculos, rollback do cabeçalho se os vínculos falharem) e checagem de duplicidade por OC + transportadora + conjunto de CT-es.
- `src/components/logistica/AdiantamentosTab.tsx`: detecção de órfãos (comparação entre `qtd_ctes` e `cteNumbers.length`) exibida como alerta no grupo da OC.
- `src/components/logistica/RegistrarQuitacaoDialog.tsx`: novo aviso para adiantamentos duplicados/órfãos, ao lado do aviso de CT-e substituído já existente.
- Sem alteração de schema (o status `cancelado` já é aceito).
