

# Ajustar Terceirizado na Portaria + Previsão Automática ao Fechar Carga

## Parte 1 — Simplificar Entrada do Terceirizado

Remover `foto_painel_url` e `km_inicial` da entrada de terceirizado. Campos finais:
- **empresa** (obrigatório)
- **foto_placa_url** (obrigatório)
- **placa** (obrigatório)
- **motorista** (obrigatório)

**`src/lib/portaria-fields-config.ts`** — VISIBILITY:
- `foto_painel_url`: terceirizado → `"oculto"` (era `"obrigatorio"`)
- `km_inicial`: terceirizado → `"oculto"` (era `"obrigatorio"`)

VISIBILITY_SAIDA — também ocultar para terceirizado:
- `km_final`: terceirizado → `"oculto"`
- `foto_painel_url`: terceirizado → `"oculto"`
- `numero_lacre`: manter ou ocultar (sem KM, lacre perde contexto) → `"oculto"`
- `conferente`, `ocorrencia`, `observacoes`: manter `"opcional"` para registro de retorno

## Parte 2 — Cargas Fechadas criam Previsão de Terceirizado

Quando uma carga é fechada no `FechamentoLoteDialog` com campo `transportadora` preenchido, inserir automaticamente um registro em `veiculos_esperados` com `grupo = "TERCEIRIZADO"`.

**`src/pages/Index.tsx`** — `handleLoteSubmit`:
Após os updates, se `transportadora` estiver preenchido, inserir em `veiculos_esperados`:
```
{
  data_referencia: dataCarregamento,
  grupo: "TERCEIRIZADO",
  placa,
  motorista,
  transportadora,
  carga_id: cargaId,
  destino: destinos resumidos,
  peso: totalPeso,
  qtd_entregas: totalPedidos,
  criado_por: user?.id
}
```

O problema é que `handleLoteSubmit` recebe apenas os updates individuais, sem acesso a `cargaId` ou `transportadora` como campos separados. Precisamos passar esses dados.

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
Alterar `onSubmit` para incluir metadados: `{ updates, meta: { cargaId, transportadora, placa, motorista, dataCarregamento, totalPeso, totalPedidos, destinos } }`.

**`src/pages/Index.tsx`**:
1. Atualizar tipo de `handleLoteSubmit` para receber os metadados
2. Após salvar os updates, se `meta.transportadora` estiver preenchido, chamar `supabase.from("veiculos_esperados").insert(...)` com os dados da carga

| Arquivo | Mudança |
|---|---|
| `src/lib/portaria-fields-config.ts` | Ocultar `foto_painel_url`, `km_inicial`, `km_final`, `numero_lacre` para terceirizado |
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Incluir metadados (cargaId, transportadora, etc.) no callback `onSubmit` |
| `src/pages/Index.tsx` | Receber metadados do fechamento e inserir previsão em `veiculos_esperados` para terceirizados |

