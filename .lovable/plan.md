## Restauração da carga CEARA SANTA INTES

### Diagnóstico confirmado
Pedido **#45** desta carga teve **12 itens "achatados"** para exatamente **33,6 kg** cada (perda total de ~14.700 kg). Comparei com `audit_log` (ação `criado`) e os pesos originais estão preservados lá.

Adicionalmente, o item **PAO DE ALHO COM CALABRESA** (pedido #45) tem `peso_original = 33,6` mas o peso atual real é `6 kg` — isso gera badge falso de ruptura ("27,6 kg cortados").

### Itens a restaurar (pedido #45)

| Produto | Peso atual | → Peso correto |
|---|---|---|
| APRESUNTADO FATIADO 180G | 33,6 | **594** |
| CALABRESINHA | 33,6 | **250** |
| INGREDIENTES P/ FEIJOADA | 33,6 | **50** |
| LANCHE | 33,6 | **1.440** |
| LING SUINA FINA APIMENTADA CL | 33,6 | **1.350** |
| LINGUICA DE CARNE SUINA P/CHUR APIM | 33,6 | **3.000** |
| LINGUIÇA SUINA P/ CHURRASCO | 33,6 | **3.000** |
| LINGUIÇA TOSCANA FRANGO C/ CHEIRO VERDE | 33,6 | **2.500** |
| LINGUIÇA TOSCANA MISTA | 33,6 | **3.500** |
| MORTADELA MINI FRANGO 400G | 33,6 | **84** |
| MORTADELA TUBOLAR TRAD | 33,6 | **200** |
| PAO DE ALHO COM CALABRESA | 6 (manter) | corrige `peso_original` 33,6 → **6** |

> **MORTADELA MINI TRAD 400G** (pedido #45) NÃO entra: o original já era 33,6 kg legítimo.

### Passos da migração

1. **Snapshot de segurança** em `data_snapshots` com o estado atual dos 13 itens do pedido #45 (rollback rápido se preciso).
2. **UPDATE** dos 12 itens achatados: `peso = peso_orig_audit`, `peso_original = peso_orig_audit`, `peso_manual = true`, `ruptura_sinalizada = false`.
3. **UPDATE** específico do PAO DE ALHO COM CALABRESA: `peso_original = 6`, `ruptura_sinalizada = false` (mantém peso=6).
4. **Log** da operação no `audit_log` com `action='restaurado'` para rastreabilidade.

### Resultado esperado
- Carga volta a totalizar os ~15.000 kg corretos no pedido #45.
- Badge falso "27,6 kg cortados" desaparece.
- Trigger `cap_peso_pelo_original` continua protegendo (peso ≤ peso_original).
- Trigger `preserve_peso_original` continua impedindo sobrescritas futuras.
