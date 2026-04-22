

## Romaneio: dois modos de impressão (Entrega vs Carregamento)

### O que muda

Hoje o romaneio mostra os badges `E:` e `C:` em cada cliente, mas a lista está sempre ordenada por **entrega** (E:1, E:2, E:3…). Você quer poder imprimir a lista **reordenada de fato** conforme o uso:

- **Modo Entrega** (motorista na rota): E:1 → E:2 → E:3… (ordem atual)
- **Modo Carregamento** (conferente do armazém): C:1 → C:2 → C:3… (inverso — primeiro a carregar é o último a entregar)

### Solução

Adicionar dois botões no `CargaPrintDialog`, substituindo o botão único "Imprimir / PDF":

- **"Imprimir Entrega"** (ícone `Truck`) — lista ordenada por `E` ascendente, título do romaneio: *"Romaneio — Sequência de Entrega"*
- **"Imprimir Carregamento"** (ícone `PackageCheck`) — lista ordenada por `C` ascendente (= `E` descendente), título: *"Romaneio — Sequência de Carregamento"*

A ordem ativa também muda a visualização **na tela** (preview espelha o que será impresso), com um toggle visual indicando qual modo está selecionado. Os badges `E:` e `C:` continuam visíveis em ambos os modos pra dar contexto cruzado.

### Mudanças concretas

- ✏️ `src/components/dashboard/CargaPrintDialog.tsx`:
  - Estado local `modo: "entrega" | "carregamento"` (default `"entrega"`).
  - `displayGroups` derivado: se `entrega`, ordena por `group.ordem` asc; se `carregamento`, ordena por `(total - group.ordem + 1)` asc (equivale a `group.ordem` desc).
  - Substituir botão único por dois botões: **"Imprimir Entrega"** e **"Imprimir Carregamento"** — cada um seta o modo e dispara `handlePrint()` na sequência (com pequeno `setTimeout` de 50ms pra garantir re-render antes do clone DOM).
  - Toggle visual no topo (mesmo padrão dos botões, com `variant="default"` no modo ativo) pra trocar a visualização sem imprimir.
  - Título do romaneio dinâmico: *"Romaneio de Carga — Entrega"* ou *"Romaneio de Carga — Carregamento"*.
  - Legenda explicativa ajustada conforme o modo: no Carregamento, destacar que *"a sequência abaixo é a ordem de empilhamento no caminhão (do fundo para a porta)"*.

### O que NÃO muda

- Sem migration, sem mexer em hook ou banco — `ordem_entrega` continua sendo a única coluna; `C` é cálculo derivado.
- `Consolidado.tsx` e `FechamentoLoteDialog` não mudam — ambos abrem o mesmo `CargaPrintDialog` que agora tem os dois modos.
- Badges `E:` / `C:` permanecem visíveis em ambos os modos pra leitura cruzada.

