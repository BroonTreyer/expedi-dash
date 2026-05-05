Vou corrigir a aba **Gastos por Vendedor** para buscar todos os registros do período, não só a primeira página retornada pela API.

Diagnóstico confirmado:
- No banco, o pedido **#104 / SENDAS FEIRA DE SANTANA / 30/04/2026** tem 4 linhas e soma **29.000 kg**.
- A requisição da tela tem **1476 registros** no período, mas a API retorna por padrão apenas uma página inicial; no snapshot da rede, aparecem só parte dos registros e o SENDAS completo não chega ao frontend.
- Por isso a tela está calculando só o pedaço que recebeu e mostra **9.000 kg**.

Plano de correção:
1. Alterar `src/hooks/useGastosVendedor.ts` para buscar `carregamentos_dia` de forma paginada com `.range(...)`, juntando todas as páginas até acabar.
2. Ordenar a busca por `data`/`carga_id`/`numero_pedido` para o resultado ser estável e não depender da ordem padrão do banco.
3. Trocar a query key para uma nova versão, forçando descarte do cache antigo no React Query.
4. Manter a consolidação de itens do mesmo pedido, então o pedido #104 deve aparecer uma única vez com **29.000 kg**.
5. Ajustar a invalidação realtime para a nova query key.
6. Remover o warning de React do componente `Kpi` no `GastosVendedorTab`, porque ele ainda aparece no console dessa aba.

Validação após aplicar:
- Abrir `/logistica` > **Gastos por Vendedor**.
- Expandir **MOÍSA**.
- Confirmar que **SENDAS FEIRA DE SANTANA** mostra:
  - Peso vendedor: **29.000 kg**
  - Peso total carga: **29.000 kg**
  - Pedido consolidado **#104** com **29.000 kg**
- Conferir que o console não mostra mais o warning do `Kpi`.