## Reorganizar cards de KPI em `src/pages/Consolidado.tsx`

**Nova ordem (4 cards):**
1. **Peso Total** — valor principal `pesoTotal kg`; sub: `"X veículos"` (usa `totalVeiculos`).
2. **Peso a Carregar** — `Math.max(0, pesoTotal - pesoCarregando - pesoExpedido)` em kg; estilo âmbar.
3. **Carregando** — mantém atual.
4. **Expedidos** — mantém atual.

**Remover:**
- Card "No pátio" (informação já visível em outra parte da tela).
- Card "Veículos" (consolidado dentro do Peso Total como sub).

**Limpeza:**
- Remover imports não usados de `lucide-react` (`ParkingCircle`, `Truck` se ficarem órfãos).

**Comportamento:**
- Sub do Peso Total sempre visível (mostra contagem de veículos).
- Peso a Carregar exibe `0 kg` quando tudo embarcado (ou ocultar se = 0 — manter visível para consistência).