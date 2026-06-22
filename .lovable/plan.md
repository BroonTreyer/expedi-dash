Plano para corrigir o caso do André/HBR9J69 no Consolidado:

1. Ajustar o hook de status da Portaria
- Incluir a placa normalizada na chave de cache do `useStatusPortariaPorCarga`.
- Hoje a chave considera apenas `carga_id` e `data`; quando a placa é corrigida, o hook pode reutilizar o resultado antigo e não recalcular o status para `HBR9J69`.

2. Manter o status vinculado à combinação correta
- Preservar a lógica atual de separar status por `carga_id + placa`, para não misturar viagens/cargas homônimas.
- Garantir que a combinação `CG-20260617-103335-RBZ + HBR9J69` busque os movimentos corretos da Portaria.

3. Validar no Consolidado
- Conferir que a carga do André com placa `HBR9J69` passe a mostrar `Expedido` no badge da Portaria.
- Confirmar que os dados do banco já estão coerentes: a entrada está `finalizado` e há saída registrada em 19/06 11:41.

Detalhe técnico:
- A correção principal será em `src/hooks/useStatusPortariaPorCarga.ts`, alterando o `idsKey` para incluir `placa` junto com `carga_id` e `data`.