

# Reestruturar fluxo de Carga Própria em 3 etapas

## Entendimento do fluxo real

O motorista já está dentro da empresa. Ele carrega o caminhão e sai para a rota — esse é o primeiro contato com a portaria. Depois retorna da rota e depois sai definitivamente.

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1ª SAÍDA       │     │  RETORNO        │     │  SAÍDA FINAL    │
│  (Saiu p/ rota) │────▶│  (Voltou)       │────▶│  (Lacre)        │
│                 │     │                 │     │                 │
│ • Foto placa    │     │ • Foto painel   │     │ • Foto lacre    │
│ • Placa         │     │ • KM final      │     │ • Nº lacre      │
│ • Motorista     │     │ • Observações   │     │ • Conferente    │
│ • KM inicial    │     │                 │     │ • Observações   │
│ • Rota          │     │                 │     │                 │
│ • Carga ID      │     │                 │     │                 │
│ • Foto painel   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
  etapa: em_rota          etapa: retornou         etapa: finalizado
```

## Mudanças

### 1. Banco de dados
- Adicionar coluna `etapa_carga_propria` (text, nullable) na tabela `movimentacoes_portaria`
- Valores: `em_rota`, `retornou`, `finalizado`

### 2. `src/lib/portaria-fields-config.ts`
- Criar `VISIBILITY_RETORNO` (nova matriz): para carga_propria mostra apenas foto_painel_url, km_final e observações
- Ajustar `VISIBILITY_SAIDA` para carga_propria: mostrar foto_lacre_url, numero_lacre, conferente e observações (a etapa do lacre)
- Ajustar `VISIBILITY` (entrada/1ª saída) para carga_propria: foto_placa, placa, motorista, km_inicial, rota, carga_id, foto_painel
- Atualizar `getVisibleFields` para aceitar o novo tipo "retorno"

### 3. `src/components/portaria/RegistroMovimentoDialog.tsx`
- Suportar 3 tipos de movimento: "saida", "retorno", "lacre" (para carga própria)
- Quando abre para registrar saída de carga própria (sem prefill), mostra campos da 1ª etapa e grava com `etapa_carga_propria: "em_rota"`
- Quando abre para retorno (prefill com etapa "em_rota"), mostra campos de retorno e grava com `etapa_carga_propria: "retornou"`
- Quando abre para lacre (prefill com etapa "retornou"), mostra campos de lacre e grava com `etapa_carga_propria: "finalizado"`
- Renomear botão "Entrada/Retorno" para "Saída p/ Rota" no seletor de tipo para carga própria

### 4. `src/components/portaria/PatioAtualTab.tsx`
- Carga Própria com `etapa: em_rota` → mostrar badge "🔵 Em Rota" e botão "Registrar Retorno"
- Carga Própria com `etapa: retornou` → mostrar badge "🟡 Retornou" e botão "Saída c/ Lacre"
- Carga Própria com `etapa: finalizado` → ocultar do pátio (já saiu)
- Ajustar o filtro `veiculosNoPatio` para excluir carga_propria finalizada

### 5. `src/hooks/useMovimentacoesPortaria.ts`
- Adicionar `etapa_carga_propria` à interface `MovimentacaoPortaria`

### 6. `src/components/portaria/MovimentoDetailsDialog.tsx`
- Exibir a etapa atual da carga própria nos detalhes

## Lógica de dados
- A 1ª saída cria um registro com `tipo_movimento: "saida"` e `etapa_carga_propria: "em_rota"`
- O retorno **atualiza** esse mesmo registro (adiciona km_final, foto_painel, observações) e muda etapa para `retornou`
- O lacre **atualiza** novamente o registro (adiciona foto_lacre, numero_lacre, conferente) e muda etapa para `finalizado`
- Isso mantém tudo em um único registro, simplificando consultas

## Arquivos afetados
- Migration SQL (nova coluna)
- `src/hooks/useMovimentacoesPortaria.ts`
- `src/lib/portaria-fields-config.ts`
- `src/components/portaria/RegistroMovimentoDialog.tsx`
- `src/components/portaria/PatioAtualTab.tsx`
- `src/components/portaria/MovimentoDetailsDialog.tsx`

