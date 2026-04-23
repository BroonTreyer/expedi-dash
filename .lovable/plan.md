

## Bug: cada ação grava 2 entradas idênticas no `audit_log`

### Diagnóstico

Cada `entity_id` aparece duplicado no Logs com o **mesmo `created_at`** (mesmo milissegundo) e o **mesmo conteúdo**. Não é o frontend rodando duas vezes: são **triggers duplicados** no banco.

Triggers atuais (consultei `pg_trigger`):

| Tabela | Triggers chamando a MESMA função |
|---|---|
| `carregamentos_dia` | `audit_carregamentos_trigger` **+** `trg_audit_carregamentos` → ambos `audit_carregamentos()` |
| `movimentacoes_portaria` | `audit_movimentacoes_trigger` **+** `trg_audit_movimentacoes` → ambos `audit_movimentacoes()` |

Resultado: cada INSERT/UPDATE/DELETE dispara a função 2x → 2 linhas no `audit_log`. As tabelas de cadastros (`clientes`, `produtos`, `motoristas`, `caminhoes`, `vendedores`, `veiculos_esperados`) têm só 1 trigger cada — estão OK.

### Mudança (migration SQL única)

Remover os triggers duplicados, mantendo apenas um por tabela:

```sql
DROP TRIGGER IF EXISTS trg_audit_carregamentos ON public.carregamentos_dia;
DROP TRIGGER IF EXISTS trg_audit_movimentacoes ON public.movimentacoes_portaria;
```

(Mantemos `audit_carregamentos_trigger` e `audit_movimentacoes_trigger` que seguem o padrão de nomenclatura dos outros — `audit_<tabela>_trigger`.)

### Limpeza dos duplicados já gravados (opcional, recomendado)

Apagar entradas duplicadas existentes em `audit_log` (mesmo `entity_type`+`entity_id`+`action`+`created_at`+`changes`), mantendo a primeira de cada grupo:

```sql
DELETE FROM public.audit_log a
USING public.audit_log b
WHERE a.id > b.id
  AND a.entity_type = b.entity_type
  AND a.entity_id = b.entity_id
  AND a.action = b.action
  AND a.created_at = b.created_at
  AND a.changes::text = b.changes::text;
```

Isso reduz o volume já acumulado e deixa a página Logs limpa retroativamente.

### Como verificar

1. Após a migration, alterar status de qualquer carga e abrir `/logs`: a alteração deve aparecer **uma única vez**.
2. Registrar/alterar uma movimentação na Portaria: idem, **uma única linha**.
3. Eventos de cadastros (cliente, produto, motorista, etc.) continuam aparecendo 1x (já estavam corretos).

### Fora do escopo

- Triggers de notificação (`on_carga_fechada`, `on_entrada_portaria`, etc.) — são funções diferentes, não duplicam logs.
- Warnings de `forwardRef` da página Logs (cosmético, não relacionado).

### Resultado esperado

Cada ação gera **exatamente 1** entrada no `audit_log`. Volume da tabela cai pela metade nos eventos de carregamento e portaria; histórico fica legível.

