

# Remover produtos do Romaneio de Carga na impressão

## Problema
O romaneio mostra linhas individuais de produto (ex: "Sem produto — 1.500 kg") dentro de cada grupo de cliente. O usuário quer ver apenas o cliente com o peso total, sem a tabela de itens.

## Mudança

### `src/components/dashboard/CargaPrintDialog.tsx`
- Remover a `<table>` de itens (linhas 142-153) dentro de cada grupo de cliente
- Manter o cabeçalho do cliente com número de ordem, código, nome e peso total

O resultado será cada bloco mostrando apenas:
```text
1. 30988 – JORGE BATISTA E CIA LTDA          9.304,6 kg
2. 16112 – JORGE BATISTA E CIA LTDA          6.730 kg
3. 19480 – CENTRAL DE FRIOS PIAUÍ LTDA       2.098,4 kg
```

Sem as linhas de "Sem produto" abaixo de cada cliente.

