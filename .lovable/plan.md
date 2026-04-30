
# Correção de bugs reais detectados em produção

A varredura completa (TypeScript, runtime, console, network, linter do banco, scan de segurança, logs de edge functions e queries de integridade de dados) encontrou **2 problemas concretos** que impactam usuários hoje. Os outros 42 alertas são ruído esperado (`SECURITY DEFINER` em funções que precisam contornar RLS por design — `has_role`, `notify_role`, `get_portal_data_public`, `audit_*`, etc.) e podem ser ignorados.

---

## Problema 1 — OCR de placas falha por estouro de pilha (CRÍTICO)

**Sintoma em produção (log de hoje, 30/04 17:32):**
```
ocr-portaria error: RangeError: Maximum call stack size exceeded
at ocrPlacaPlateRecognizer (index.ts:13:30)
```

**Causa:** em `supabase/functions/ocr-portaria/index.ts` linha 17, a conversão da imagem para base64 usa:
```ts
btoa(String.fromCharCode(...new Uint8Array(imgBuffer)))
```
O operador `...` empurra **cada byte da imagem** (centenas de milhares) como argumento individual no `String.fromCharCode`, estourando a pilha. Toda foto de placa um pouco maior trava o OCR.

**Impacto:** o porteiro tira foto da placa e o sistema retorna erro genérico. Tem que digitar manualmente.

**Correção:** processar o buffer em pedaços (ou enviar o blob direto, sem base64 — a API do Plate Recognizer aceita upload binário no FormData):

```ts
const blob = new Blob([imgBuffer]);
const form = new FormData();
form.append("upload", blob, "plate.jpg");
form.append("regions", "br");
// (remove btoa/base64)
```

Isso elimina a conversão base64 inteira — mais rápido, sem estouro.

---

## Problema 2 — 16 movimentos de portaria "fantasmas" travados (MÉDIO)

**Sintoma:** existem **16 registros** em `movimentacoes_portaria` com `horario_entrada` preenchido, sem `horario_saida_final`, há mais de 24h. Destes, **15 já estão com etapa = `finalizado`** mas o `horario_saida_final` ficou nulo.

Exemplo:
```
placa JBM8E58 — entrada 23/04 — etapa_terceirizado=finalizado — horario_saida_final=NULL
placa RZU1A65 — entrada 24/04 — etapa_terceirizado=finalizado — horario_saida_final=NULL
... +13 outros
```

**Causa provável:** algum fluxo de finalização (botão "finalizar manualmente" no admin, ou exit do veículo) atualiza a etapa mas esquece de carimbar `horario_saida_final`. Esses registros aparecem como "ainda no pátio" em KPIs e relatórios.

**Correção em duas frentes:**

1. **Migration de limpeza** — para os 15 já finalizados, preencher `horario_saida_final` com o `horario_entrada` (ou um valor seguro derivado dos timestamps `etapa_*`):
   ```sql
   UPDATE movimentacoes_portaria
   SET horario_saida_final = COALESCE(horario_saida_final, now())
   WHERE (etapa_terceirizado = 'finalizado' OR etapa_carga_propria = 'finalizado')
     AND horario_saida_final IS NULL;
   ```

2. **Trigger preventivo** — garantir que sempre que a etapa virar `finalizado`, o horário de saída seja carimbado automaticamente:
   ```sql
   CREATE OR REPLACE FUNCTION public.set_horario_saida_on_finalizado()
   RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
   BEGIN
     IF (NEW.etapa_terceirizado = 'finalizado' OR NEW.etapa_carga_propria = 'finalizado')
        AND NEW.horario_saida_final IS NULL THEN
       NEW.horario_saida_final := now();
     END IF;
     RETURN NEW;
   END $$;
   ```
   E aplicar em `BEFORE UPDATE` em `movimentacoes_portaria`.

Restará apenas **1 caso real** (`SINOMAR JOSE PEREIRA / SUZ0E27`, etapa `no_patio` desde 29/04) — esse é um motorista de fato esquecido, e vai aparecer normalmente nas listas de "no pátio" para o time tratar.

---

## Itens descartados (ruído, sem ação)

- **42 warnings de `SECURITY DEFINER`** — funções `has_role`, `notify_role`, `get_portal_data_public`, `audit_*`, `handle_new_user`, etc. são SECURITY DEFINER **por design** (contornam RLS de forma controlada). O risco real é mitigado pelo `set search_path = public` que já está em todas elas. Mexer aqui é alto risco e nenhum ganho.
- **1 carga sem veículo esperado** — caso isolado dos últimos 7 dias, provavelmente fluxo legítimo (carga sem placa atribuída ainda).
- **0 veículos esperados duplicados, 0 pesos acima do original, 0 cargas órfãs.**

---

## Arquivos a alterar

- `supabase/functions/ocr-portaria/index.ts` — remover `btoa(...)` e enviar blob direto.
- **Migration nova** — UPDATE de limpeza + função `set_horario_saida_on_finalizado` + trigger BEFORE UPDATE em `movimentacoes_portaria`.

Tempo estimado: ~10 min. Risco: baixo (mudança de OCR é equivalente, migration é idempotente, trigger só age quando a etapa fica `finalizado`).
