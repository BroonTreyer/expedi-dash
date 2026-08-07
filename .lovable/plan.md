# EDIVAR ROTA não aparece na página Distribuidores

## Causa confirmada

A página Distribuidores lista apenas clientes cadastrados com tipo **distribuidor**. Os 6 clientes da carga EDIVAR ROTA estão cadastrados como tipo **outros**:

```text
20355 SAMAR DISTRIBUIDORA   -> outros
21447 DAKASA ALIMENTOS      -> outros
26940 BRASIL SUPREMO        -> outros
28770 UNIK ALIMENTOS        -> outros
34342 MULTI MAIS            -> outros
34552 VALCIELIO             -> outros
```

Como nenhum deles é distribuidor, a carga não tem onde aparecer nessa tela. Na Portaria - Distribuidores ela está correta: movimentação de terceirizado com entrada liberada às 16:36, etapa "no pátio", sem saída.

## Correção

**1. Marcar os clientes da carga como distribuidor**
- Atualizar os 6 clientes acima para tipo `distribuidor`, para que a carga EDIVAR ROTA e o histórico de pedidos deles passem a aparecer na página Distribuidores com a linha do tempo completa.

**2. Facilitar a marcação daqui pra frente (evitar o mesmo problema)**
- Na página Distribuidores, adicionar um bloco "Sugestões": clientes que tiveram pedidos em cargas de terceirizados (com transportadora) nos últimos 60 dias e ainda não estão marcados como distribuidor.
- Cada sugestão com botão para marcar como distribuidor em um clique (ou seleção em lote), usando o fluxo já existente de "Marcar clientes".
- Assim, quando um cliente novo entra numa carga de distribuidores, ele aparece como sugestão em vez de simplesmente ficar invisível na tela.

## Detalhes técnicos

- Correção de dados: `clientes.tipo = 'distribuidor'` para os códigos 20355, 21447, 26940, 28770, 34342, 34552.
- `src/hooks/useDistribuidores.ts`: nova consulta de sugestões — códigos de cliente distintos em `carregamentos_dia` com `transportadora` preenchida nos últimos 60 dias, excluindo os já marcados como distribuidor.
- `src/pages/Distribuidores.tsx`: card/seção "Sugestões de distribuidores" reutilizando `marcarComoDistribuidor` e invalidando as queries `distribuidores` e `clientes`.
- Nenhuma mudança de schema; a classificação continua sendo `clientes.tipo`.
