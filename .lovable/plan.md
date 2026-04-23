

## Editar dados do veículo em "Aguardando vínculo da Logística"

### Problema

Quando a Portaria registra a chegada de um veículo walk-in mas esquece de informar a transportadora (ou erra placa/motorista/tipo), hoje não há como corrigir — o card em "Aguardando vínculo da Logística" é somente leitura. A Logística precisa recusar e pedir novo registro.

### Mudança

Adicionar botão **Editar** em cada card do painel `SolicitacoesPendentesPanel` (apenas para cards `aguardando`, antes da decisão de vínculo). Abre um diálogo simples para corrigir os campos do `veiculos_esperados`.

#### 1. Novo componente `src/components/portaria/EditarVeiculoEsperadoDialog.tsx`

Diálogo com os campos editáveis:
- **Placa** (Input, uppercase + trim ao salvar)
- **Motorista** (MotoristaAutocomplete — reaproveita componente, preenche transportadora/tipo se selecionar cadastro)
- **Transportadora** (Input livre — para casos em que não há motorista cadastrado)
- **Tipo de veículo** (Input)
- **Observações** (Textarea)

Salva com `supabase.from("veiculos_esperados").update({...}).eq("id", v.id)` e invalida queries `veiculos_walkin_ativos`, `veiculos_esperados_pendentes`, `veiculos_esperados`.

Toast de sucesso "Dados atualizados" / erro padrão.

#### 2. `src/components/portaria/SolicitacoesPendentesPanel.tsx`

- Importar o novo dialog e `Pencil` do `lucide-react`.
- Adicionar estado `editarVeiculo: VeiculoEsperado | null`.
- No bloco de ações de `aguardando`, antes de "Vincular a carga" / "Recusar", adicionar um botão `outline` pequeno com ícone Pencil + texto "Editar" (visível para `canDecide`, igual aos outros botões do card).
- Renderizar `<EditarVeiculoEsperadoDialog open={!!editarVeiculo} onOpenChange={...} veiculo={editarVeiculo} />` no final do componente.

### O que NÃO muda

- Banco: nenhuma migração — todos os campos já existem em `veiculos_esperados`.
- RLS: `Ops update veiculos_esperados` já permite admin/logistica/portaria.
- Cards `liberado` continuam apenas com botão "Liberar Entrada no Pátio" (não faz sentido editar após autorização).
- Painel de cargas fechadas, fluxo de vincular carga, demais telas.

### Arquivos afetados

- `src/components/portaria/EditarVeiculoEsperadoDialog.tsx` — novo.
- `src/components/portaria/SolicitacoesPendentesPanel.tsx` — botão Editar + estado.

### Resultado

Card "Aguardando vínculo da Logística" ganha botão **Editar** ao lado de "Vincular a carga" / "Recusar". Logística (ou Admin) corrige a transportadora esquecida em segundos, sem precisar recusar e refazer o registro.

