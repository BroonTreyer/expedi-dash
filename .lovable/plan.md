

# Igualar Cadastro Terceirizado ao Carga Própria

## Resumo

Atualizar a matriz de visibilidade em `portaria-fields-config.ts` para que "Terceirizado" tenha os mesmos campos de "Carga Própria", com duas diferenças:
- **Remover**: `rota` e `carga_id` (Ordem de Carga)
- **Manter**: `empresa` (Transportadora) — que já existe no terceirizado

## Mudanças na matriz VISIBILITY (entrada)

| Campo | Carga Própria (ref) | Terceirizado atual | Terceirizado novo |
|-------|--------------------|--------------------|-------------------|
| tipo_operacao | oculto | obrigatorio | **oculto** |
| empresa | oculto | obrigatorio | **obrigatorio** (mantém) |
| documento | oculto | obrigatorio | **oculto** |
| placa | obrigatorio | obrigatorio | obrigatorio ✓ |
| motorista | obrigatorio | obrigatorio | obrigatorio ✓ |
| foto_placa_url | obrigatorio | obrigatorio | obrigatorio ✓ |
| foto_painel_url | obrigatorio | oculto | **obrigatorio** |
| km_inicial | obrigatorio | oculto | **obrigatorio** |
| rota | obrigatorio | oculto | **oculto** (remove) |
| carga_id | opcional | opcional | **oculto** (remove) |
| nota_fiscal | oculto | opcional | **oculto** |
| responsavel_interno | oculto | opcional | **oculto** |
| observacoes | oculto | opcional | **oculto** |
| foto_documento_url | oculto | obrigatorio | **oculto** |

## Mudanças na matriz VISIBILITY_SAIDA (retorno)

Copiar os valores de carga_propria para terceirizado (km_final, numero_lacre, conferente, ocorrencia, observacoes, foto_painel_url — todos os campos de retorno).

## Atualizar `needsExitDialog`

Com os campos de saída preenchidos para terceirizado, `needsExitDialog("terceirizado")` passará a retornar `true` automaticamente.

| Arquivo | Mudança |
|---|---|
| `src/lib/portaria-fields-config.ts` | Atualizar VISIBILITY e VISIBILITY_SAIDA do terceirizado para espelhar carga_propria (sem rota/carga_id, com transportadora) |

