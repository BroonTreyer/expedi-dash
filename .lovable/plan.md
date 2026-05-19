## Problema

Na linha da carga **CF FRANGO / Raimundo / RBK7D22** o badge da coluna **Portaria** mostra **"Aguardando chegada"**, mas o caminhão já está **no pátio** desde 19/05.

### Causa raiz

A carga foi cadastrada para o dia **15/05**, mas o caminhão só entrou no pátio no dia **19/05** (4 dias depois).

O hook `useStatusPortariaPorCarga` aplica uma **janela operacional** ao buscar movimentos da portaria por `carga_id`:

```
12h antes da data da carga  →  48h depois da data da carga
```

Como o movimento de entrada (19/05) está **96h depois** da data da carga (15/05), ele é **descartado** pelo filtro. Sem nenhum movimento válido, o status volta ao padrão `aguardando` → badge "Aguardando chegada".

O mesmo bug afeta qualquer carga em que o veículo chega com mais de 2 dias de atraso em relação à data planejada — situação comum em terceirizadas que ficam alguns dias rodando antes de retornar para carregar.

## Correção

Em `src/hooks/useStatusPortariaPorCarga.ts`, dentro do `queryFn`:

1. Agrupar os movimentos por `carga_id` **sem** filtro de data primeiro.
2. Para cada carga, **tentar** filtrar pela janela 12h/48h.
3. Se a filtragem por janela **eliminar todos os movimentos** (caso do Raimundo), usar o conjunto completo de movimentos daquela carga — assim a portaria sempre reflete o estado real, mesmo com atraso.
4. Manter o filtro de placa (que já protege contra contaminação entre cargas distintas com o mesmo `carga_id`).

Resultado: a linha do Raimundo passará a mostrar **"No pátio"** corretamente, e o comportamento original (proteção contra cargas homônimas em datas diferentes) continua valendo nos casos em que existe ao menos um movimento dentro da janela.

## Arquivos alterados

- `src/hooks/useStatusPortariaPorCarga.ts` (lógica do `queryFn`)

Nenhuma mudança em UI ou banco.
