---
name: Ruptura management
description: Ruptures tracked via 'ruptura_sinalizada' DB trigger; partial-rupture detection respects explicit frontend overrides
type: feature
---
A tag RUPTURA acende quando `ruptura_sinalizada = true`. Triggers `set_ruptura_sinalizada` e `preserve_peso_original` calculam isso automaticamente:

- `ruptura = true` → `ruptura_sinalizada = true`
- `ruptura = false` AND `peso < peso_original` → `ruptura_sinalizada = true` (ruptura PARCIAL silenciosa)
- `ruptura = false` AND `peso >= peso_original` → `ruptura_sinalizada = false`

**Override explícito do frontend (abr/2026):** Se o UPDATE vier com `ruptura_sinalizada` ou `peso_original` distintos do valor antigo, as triggers RESPEITAM o que o frontend mandou em vez de re-derivar. Isso permite ao usuário "confirmar redução intencional" no `CarregamentoDialog`:

- **Restaurar original**: seta `peso = peso_original` (a tag some sozinha).
- **Confirmar redução**: envia `peso_original = peso` + `ruptura_sinalizada = false` no payload — redefine o baseline e apaga a tag.

A UI mostra um aviso amarelo no `CarregamentoDialog` por linha quando `peso < peso_original` e `!ruptura`, com os dois botões acima.

**Hook `useEditarPedidoAprovacao`** também envia `ruptura_sinalizada: false` defensivamente quando o vendedor desmarca ruptura.
