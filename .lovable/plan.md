

# Ajustes na categoria "Carga Própria"

## Mudanças na matriz de visibilidade (`portaria-fields-config.ts`)

Para **Carga Própria**, tornar **oculto** os seguintes campos:
- `tipo_operacao` (será sempre CARGA/ENTREGA, não precisa exibir)
- `documento`
- `apelido`
- `peso`
- `qtd_entregas`
- `km_rota`
- `km_inicial`
- `km_final`
- `foto_documento_url`
- `foto_painel_url` (sem KM, sem foto do painel)

## Novo campo: N° Lacre

1. **Migração SQL**: adicionar coluna `numero_lacre text` na tabela `movimentacoes_portaria`
2. **Config**: adicionar field `numero_lacre` no array `FIELDS` (bloco "operacao", type "text")
3. **Visibilidade**: `carga_propria: "obrigatorio"`, demais categorias: `"oculto"` (ou ajustar conforme necessário)
4. **Interface do hook**: adicionar `numero_lacre` à interface `MovimentacaoPortaria`

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | `ADD COLUMN numero_lacre text` |
| `portaria-fields-config.ts` | Ocultar 10 campos para carga_propria, adicionar campo `numero_lacre` |
| `useMovimentacoesPortaria.ts` | Adicionar `numero_lacre` na interface |

