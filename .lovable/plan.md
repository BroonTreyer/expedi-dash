## O que aconteceu

O registro do Gustavo (RAR6B66, carga VANESSA + BRUNO) está correto no banco: chegada registrada às 11:03, aguardando liberação para o pátio. Ele sumiu da tela por causa de filtros de visibilidade:

- O painel azul "Cargas fechadas aguardando veículo" só mostra cargas com data planejada nos últimos **7 dias**. A carga dele tem data **14/05** (quase 1 mês atrás), então fica fora da janela.
- Como ele não está mais "No Pátio" (corretamente, pois ainda não foi liberado), ele não aparece em lugar nenhum — virou registro fantasma.
- Há ainda um segundo filtro (janela de -12h a +48h ao redor da data da carga) que também impediria o badge "Aguardando liberação", já que a chegada (11/06) é muito depois da data planejada.

## Correção (código)

**Regra nova: uma chegada pendente nunca pode ficar invisível.**

1. **`src/hooks/useCarregamentos.ts` (useCargasFechadasAguardando)**
   - Buscar também movimentações de entrada ativas (`horario_entrada` vazio, sem saída) dos últimos 7 dias e incluir as cargas vinculadas a elas, mesmo que a data da carga esteja fora da janela de 7 dias.
   - Quando há chegada ativa recente, marcar a carga como "Aguardando liberação" mesmo fora da janela -12h/+48h — a chegada real vale mais que a data planejada.

2. **`src/components/portaria/PatioAtualTab.tsx`** (defesa em profundidade)
   - Mostrar terceirizados com chegada registrada e carga vinculada como linha "Aguardando liberação" (hoje só os sem vínculo aparecem), com botão de liberar entrada. Assim, mesmo que o painel azul falhe, o registro nunca desaparece.

## Resultado esperado

- Gustavo volta a aparecer imediatamente no painel azul como "Aguardando liberação", com botões "Liberar entrada no pátio" e "Desfazer chegada".
- Nenhuma mudança no banco — os dados dele já estão corretos.

## Verificação

- Abrir Portaria → Terceirizado e confirmar que a carga VANESSA + BRUNO aparece com badge "Aguardando liberação".
- Clicar "Liberar entrada" → ele entra no Pátio Atual normalmente.