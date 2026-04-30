## Diagnóstico

Salvar **redução** de peso (ex.: marcar/desmarcar ruptura) funciona — foi o caso do ALCIR.
Salvar **aumento** de peso ou quantidade não persiste. Recarrega e volta ao valor antigo.

A causa está em uma camada que ainda não tínhamos olhado: **gatilhos no banco**.

A tabela `carregamentos_dia` tem hoje o gatilho `cap_peso_pelo_original` rodando antes de cada `UPDATE`. Ele faz literalmente:

```text
se peso > peso_original * 1.001 então peso := peso_original
```

Ou seja: se o usuário tenta gravar 150 kg num item que tinha `peso_original = 100`, o banco aceita o update mas silenciosamente devolve o peso para 100. A UI atualiza otimisticamente para 150, depois o realtime traz 100 do banco e parece que "não salvou".

Para piorar, esse gatilho está **duplicado** (`trg_cap_peso` e `trg_cap_peso_pelo_original`), assim como `trg_audit_carregamentos`/`audit_carregamentos_trigger`, `trg_carga_fechada`/`trg_on_carga_fechada`, `trg_set_ruptura_sinalizada`/`trg_ruptura_sinalizada`, `trg_vincular_veiculo_esperado_tardio`/`trg_vincular_veiculo_tardio`, `trg_pedido_enviado_aprovacao`/`trg_on_pedido_enviado_aprovacao` e `trg_pedido_aprovado_rejeitado`/`trg_on_pedido_aprovado_rejeitado`. Isso significa cada operação dispara cada efeito **duas vezes** — log de auditoria duplicado, notificações duplicadas, criação dupla de veículo esperado, etc.

A quantidade também "volta" porque, ao recarregar, a UI recalcula a quantidade a partir do peso (que voltou ao original) usando o peso padrão do produto.

## O que vou corrigir

### 1. Permitir aumento de peso pela edição manual

O gatilho `cap_peso_pelo_original` foi criado para impedir que sistemas externos jogassem peso acima do original. Mas ele não pode bloquear uma edição manual feita por logística/faturamento — precisa atualizar o `peso_original` quando o usuário aumenta o peso explicitamente.

Mudanças:

- No diálogo de edição (`CarregamentoDialog`): quando o peso novo de um item ficar **acima** do `peso_original` atual, enviar também `peso_original = peso novo` no payload (igualando baseline para cima). Quando ficar abaixo, manter o comportamento atual (só mexe em `peso_original` se o usuário confirmou a redução com o botão "Confirmar redução").
- Garantir que isso valha tanto para o item principal quanto para os itens irmãos do grupo.

Resultado: ao gravar 150 kg num item de 100, o banco passa a ter `peso_original = peso = 150`, e o cap nunca dispara.

### 2. Limpar gatilhos duplicados

Migration para fazer `DROP TRIGGER IF EXISTS` nos duplicados, mantendo apenas uma versão de cada:

- manter `trg_cap_peso_pelo_original`, dropar `trg_cap_peso`
- manter `trg_audit_carregamentos`, dropar `audit_carregamentos_trigger`
- manter `trg_on_carga_fechada`, dropar `trg_carga_fechada`
- manter `trg_set_ruptura_sinalizada`, dropar `trg_ruptura_sinalizada`
- manter `trg_vincular_veiculo_tardio`, dropar `trg_vincular_veiculo_esperado_tardio`
- manter `trg_on_pedido_enviado_aprovacao`, dropar `trg_pedido_enviado_aprovacao`
- manter `trg_on_pedido_aprovado_rejeitado`, dropar `trg_pedido_aprovado_rejeitado`
- manter `trg_update_carregamentos_updated_at`, dropar `update_carregamentos_dia_updated_at`

Isso elimina auditorias duplicadas, notificações duplicadas e criação dupla de veículos esperados na portaria — efeito colateral pesado que vinha acontecendo desde antes.

### 3. Validar

Após o deploy, vou abrir um pedido de logística que tem `peso_original < peso desejado`, aumentar o peso, salvar, recarregar e confirmar que o valor permanece. Também vou conferir no `audit_log` se cada save grava apenas **uma** linha (e não duas).

## Por que isso explica o sintoma

- ALCIR: usuário estava **desmarcando ruptura** (peso voltando para o original ou ficando ≤ original). Cap do banco não dispara. Funcionou após nossa correção anterior.
- Outros pedidos: usuário está **aumentando peso/quantidade** acima do `peso_original`. Cap do banco anula a alteração silenciosamente. Por isso "não salva por mais que tente".
