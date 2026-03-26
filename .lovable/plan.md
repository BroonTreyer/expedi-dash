

## Alteração

Mover os campos **N° Lacre**, **Conferente**, **Ocorrência** e **Observações** da entrada para o retorno (saída) na categoria Carga Própria.

## Mudança

| Arquivo | O que muda |
|---|---|
| `src/lib/portaria-fields-config.ts` | Na matriz `VISIBILITY` (entrada), setar `numero_lacre`, `conferente`, `ocorrencia`, `observacoes` como `"oculto"` para `carga_propria`. Na matriz `VISIBILITY_SAIDA`, setar esses 4 campos como visíveis para `carga_propria`: `numero_lacre` → `"obrigatorio"`, `conferente` → `"opcional"`, `ocorrencia` → `"opcional"`, `observacoes` → `"opcional"` |

Nenhuma mudança em componentes — o formulário dinâmico já lê a matriz automaticamente.

