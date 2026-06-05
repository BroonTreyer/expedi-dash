## Problema
O card "AGUARDANDO LIBERAÇÃO" da placa SE06H14 no painel `SolicitacoesPendentesPanel` (rota `/portaria/terceirizado`) só mostra o botão **"Vincular a carga"**. Não há botão **"Recusar"** ou **"Desfazer chegada"**, então quando o porteiro/logística não quer aceitar aquela chegada o veículo continua aparecendo na base indefinidamente.

Causa: o cartão vem de um `movimentacoes_portaria` (chegada de terceirizado sem `carga_id`) — `__source === "mov"`. No render (linhas 243‑276) os botões "Editar" e "Recusar" são escondidos quando `__source === "mov"`; só são exibidos para registros vindos de `veiculos_esperados`.

## Mudança
Arquivo: `src/components/portaria/SolicitacoesPendentesPanel.tsx`

1. Adicionar um handler `handleDesfazerMov(mov)` que faz `DELETE em movimentacoes_portaria WHERE id = mov.id AND horario_entrada IS NULL` (mesma lógica segura já usada em `PatioAtualTab.handleDesfazerChegada`), com toast e invalidate das queries `["movimentacoes_portaria"]` e `["movimentos_orfaos"]`.
2. No bloco `__source !== "mov"` da seção "Recusar" (linha 266‑276), adicionar um ramo `else` para `__source === "mov"`: renderizar um botão **"Recusar / Desfazer chegada"** (variant destructive) que chama `handleDesfazerMov(v.__mov)`. Visível apenas para `canDecide` (admin / logística), mantendo paridade com o botão "Recusar" original.
3. Manter o botão "Vincular a carga" intocado. Não mexer no fluxo de `veiculos_esperados` nem no dialog de motivo de recusa (esse dialog só faz sentido para `veiculos_esperados`, pois grava `motivo_recusa`; para movs não há campo equivalente, então a recusa é uma deleção direta com `toast.success("Chegada recusada")`).

## Fora de escopo
- Não mudar permissões: porteiro continua sem decidir (só admin/logística), igual ao botão "Recusar" existente.
- Não alterar `useVeiculosEsperados`, `VincularMovimentoCargaDialog`, RLS ou edge functions.
- Não tocar em `PatioAtualTab` (lá o Desfazer já existe para o mesmo cenário quando o card aparece como "Aguardando vínculo").
