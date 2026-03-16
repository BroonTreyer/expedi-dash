

# Espelhar filtros de Cliente e UF para todos os perfis

## Situação atual
- **Header fixo** e **scroll proxy inferior** já são globais — funcionam para todos os perfis
- **Filtros de Cliente e UF** existem apenas na view da Logística — Admin e Faturamento não conseguem filtrar por cliente ou UF
- **Seleção com checkbox** é exclusiva da logística (faz sentido manter assim, é operação de montagem de carga)

## Mudança necessária

### `src/components/dashboard/Filters.tsx`
Adicionar os selects de **Cliente** e **UF** na view padrão (admin/faturamento), junto aos filtros já existentes (data, etapa, status, vendedor, tipo caminhão, ruptura, busca).

Ordem dos filtros para admin/faturamento:
Data → Etapa → Status → Vendedor → **Cliente** → **UF** → Tipo Caminhão → Ruptura → Busca

## Resultado
- Admin vê todos os filtros incluindo Cliente e UF
- Faturamento vê todos os filtros incluindo Cliente e UF
- Logística continua com apenas Vendedor, Cliente e UF (sem alteração)
- Header fixo e scroll proxy inferior já funcionam para todos

