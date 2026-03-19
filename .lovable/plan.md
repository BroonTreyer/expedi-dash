

## Plano: Refatorar "Fechar Carga" para Foco Logístico com Mapa de Rota

### Visão Geral
Transformar o dialog de "Fechar Carga" de uma visão detalhada de itens/produtos para uma interface orientada à expedição, com foco em destinos, localização geográfica e visualização de rota em mapa.

### 1. Refatorar a interface `ClienteGroup` e o agrupamento

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
- Remover `nomeProduto` dos items do grupo — guardar apenas `id` e `peso`
- Adicionar `cidade` e `uf` ao `ClienteGroup`
- Adicionar `numeroPedido` aos items para identificação
- No `useEffect` de agrupamento, capturar `cidade`, `uf` e `numero_pedido` do `Carregamento`

### 2. Remover listagem de itens/produtos

- Eliminar completamente o bloco que renderiza `group.items` com checkboxes individuais por produto (linhas 264-281)
- Manter apenas o nível de grupo (cliente/destino) com checkbox de seleção
- Cada card de grupo exibe: checkbox, ordem, nome do cliente, cidade/UF, quantidade de pedidos, peso total

### 3. Reorganizar os cards de destino

Cada card de cliente/destino mostrará:
```text
[✓] [1]  33004 – DMA 173
         Belo Horizonte – MG
         4 pedidos · 407,2 kg
         Pedidos: #1234, #1235, #1236, #1237
```

- Layout limpo, sem detalhamento de produtos
- Cidade e UF em destaque como informação principal de destino
- Números dos pedidos listados de forma compacta

### 4. Adicionar mapa de rota ao final do dialog

- Usar **Leaflet** (via `react-leaflet`) — biblioteca open-source, sem API key
- Criar componente `RotaMap` dentro do dialog
- Geocodificação simples: usar um dicionário estático de coordenadas das capitais/cidades principais do Brasil, ou usar a API Nominatim (OpenStreetMap, gratuita) para buscar lat/lng por "cidade, UF, Brasil"
- O mapa mostrará:
  - Markers numerados (ordem de entrega) para cada destino
  - Polyline conectando os pontos na ordem de entrega
  - Popup com nome do cliente e cidade ao clicar no marker
- O mapa atualiza automaticamente quando a ordem dos grupos muda ou itens são excluídos

### 5. Resumo visual no topo da seção de destinos

- Barra de resumo: total de cidades, total de pedidos, peso total, UFs envolvidas
- Badges com as UFs da carga (ex: `MG` `SP` `RJ`)

### 6. Dependências

- Instalar `react-leaflet` e `leaflet` via package.json
- Adicionar CSS do Leaflet no `index.html` ou importar no componente
- Usar Nominatim API (gratuita, sem key) para geocodificação — com cache local para evitar requisições repetidas

### 7. Manter compatibilidade

- O `handleSubmit` e `onPrintReady` continuam funcionando igual
- O `CargaPrintDialog` (romaneio) mantém o detalhamento de produtos — só o dialog de fechamento muda
- A interface `CargaPrintData` não precisa mudar

### Arquivos alterados
- `src/components/dashboard/FechamentoLoteDialog.tsx` — refatoração completa da UI
- `src/components/dashboard/RotaMap.tsx` — novo componente de mapa
- `index.html` — link CSS do Leaflet
- `package.json` — adicionar `react-leaflet`, `leaflet`, `@types/leaflet`

### Sem alterações no banco de dados

