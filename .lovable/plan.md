

# Desfazer Carga + Rastreio de Despacho

## Situação Atual

Hoje, ao "Fechar Carga", o sistema grava nos pedidos selecionados: `tipo_caminhao`, `placa`, `motorista`, `ordem_entrega` e `etapa: "logistica"`. **Não existe forma de desfazer** — os dados ficam gravados e não há como reverter ao estado anterior de "vendas".

Além disso, não existe um identificador de "carga" que agrupe os pedidos despachados juntos, dificultando saber quais pedidos pertencem à mesma carga.

## Proposta

### 1. Identificador de Carga

Adicionar coluna `carga_id` (text, nullable) na tabela `carregamentos_dia`. Ao fechar carga, gerar um ID único (ex: `CG-20260316-001`) e gravar em todos os pedidos da carga. Isso permite:
- Saber quais pedidos foram despachados juntos
- Filtrar/agrupar por carga na tabela

**Migração SQL:** `ALTER TABLE carregamentos_dia ADD COLUMN carga_id text;`

### 2. Botão "Desfazer Carga"

Na tabela, quando um pedido tem `carga_id`, exibir um botão/ação "Desfazer Carga" (visível para admin e logística). Ao clicar:
- Diálogo de confirmação
- Limpa `tipo_caminhao`, `placa`, `motorista`, `ordem_entrega`, `horario_previsto` e `carga_id` de **todos os pedidos com aquele `carga_id`**
- Retorna `etapa` para `"vendas"`

### 3. Indicador visual de Carga na tabela

Pedidos que pertencem à mesma carga terão um badge com o `carga_id`, facilitando identificar o que já foi despachado.

### 4. Integração no FechamentoLoteDialog

No `handleSubmit`, gerar o `carga_id` e incluí-lo nos updates de cada pedido.

### Arquivos editados/criados
- **Migração SQL** — coluna `carga_id`
- `src/components/dashboard/FechamentoLoteDialog.tsx` — gerar e gravar `carga_id`
- `src/components/dashboard/CarregamentoTable.tsx` — badge de carga + botão "Desfazer Carga"
- `src/pages/Index.tsx` — handler de desfazer carga (limpar campos de todos os pedidos do grupo)
- `src/hooks/useCarregamentos.ts` — atualizar tipo para incluir `carga_id`

