

# Aplicar Busca na Aba de Veículos Esperados

## Problema

O campo de busca filtra apenas as abas Pátio e Histórico. A aba Esperados recebe `veiculos={veiculosEsperados}` sem nenhum filtro de busca aplicado.

## Solução

1. **`src/components/portaria/VeiculosEsperadosPanel.tsx`**: Adicionar prop `search?: string` na interface. Filtrar a lista internamente por placa, motorista, transportadora, destino e carga_id antes de renderizar.

2. **`src/pages/Portaria.tsx`**: Passar `search={search}` para o `VeiculosEsperadosPanel`.

| Arquivo | Mudança |
|---|---|
| `src/components/portaria/VeiculosEsperadosPanel.tsx` | Adicionar prop `search`, filtrar veículos por placa/motorista/transportadora/destino/carga_id |
| `src/pages/Portaria.tsx` | Passar `search={search}` ao componente |

