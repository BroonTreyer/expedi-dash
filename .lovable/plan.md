

# Tornar campo KM Inicial visível para Carga Própria

## Problema
O campo `km_inicial` está definido como `"oculto"` para `carga_propria` na matriz de visibilidade. Por isso, mesmo com a foto do painel e o OCR funcionando, o campo de KM não aparece no formulário.

## Solução

### `portaria-fields-config.ts`
Alterar a visibilidade de `km_inicial` para `carga_propria` de `"oculto"` → `"obrigatorio"`, para que o campo apareça logo abaixo da foto do painel no bloco Operação, exibindo o valor lido pelo OCR.

| Campo | Antes | Depois |
|-------|-------|--------|
| `km_inicial` | `carga_propria: "oculto"` | `carga_propria: "obrigatorio"` |

Reordenar `km_inicial` no array `FIELDS` para ficar logo após `foto_painel_url`, garantindo a sequência: Foto → OCR → Campo KM.

## Arquivo modificado
- `src/lib/portaria-fields-config.ts`

