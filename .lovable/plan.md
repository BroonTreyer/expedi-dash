

# Simplificar Campos da Saída — Apenas 4 Campos

## Problema

Na saída, estão aparecendo campos extras (KM Final, Foto Painel, Ocorrência, etc.). O usuário quer que a saída mostre **apenas**: Foto do Lacre → N° Lacre → Conferente → Observações.

## Solução

Alterar `VISIBILITY_SAIDA` em `src/lib/portaria-fields-config.ts`:

1. Setar `km_final`, `foto_painel_url`, `ocorrencia` para `"oculto"` em todas as categorias
2. Manter apenas estes 4 campos visíveis na saída:
   - `foto_lacre_url` — obrigatório (carga_propria, terceirizado, fornecedor)
   - `numero_lacre` — obrigatório (carga_propria, terceirizado, fornecedor)
   - `conferente` — opcional (carga_propria, terceirizado, fornecedor)
   - `observacoes` — opcional (carga_propria, terceirizado, fornecedor)

Garantir que a ordem no array `FIELDS` posicione `foto_lacre_url` antes de `numero_lacre`, que já está correto (foto_lacre_url está no bloco evidencias, numero_lacre no bloco operacao). Para forçar a ordem desejada, mover `foto_lacre_url` e `numero_lacre` para o bloco `controle`, logo antes de `conferente` e `observacoes`.

| Arquivo | Mudança |
|---|---|
| `src/lib/portaria-fields-config.ts` | Ocultar km_final/foto_painel/ocorrencia na saída; reordenar campos para foto_lacre → lacre → conferente → obs |

