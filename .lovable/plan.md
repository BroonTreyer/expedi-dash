

## Plano: Botão Roteirizar no Painel + Mapa com Rota Real em Tempo Real

### O que muda

1. **Mover botão "Roteirizar" para fora do dialog**, ao lado de "Fechar Carga" na barra de seleção do `Index.tsx`
2. **Criar dialog/painel de roteirização separado** que mostra mapa + destinos + rota otimizada, sem campos de transporte
3. **Rota real ao selecionar pedidos**: ao clicar "Roteirizar" no painel, chama a edge function OSRM e mostra o mapa com rota por estrada (não linhas retas)
4. **Dentro de "Fechar Carga"**: remover botão roteirizar, manter mapa apenas como visualização (se rota já foi calculada, reutilizar). Foco em preencher dados de transporte e fechar
5. **Mapa no RotaMap**: usar sempre a rota real (OSRM) quando disponível; quando não há rota calculada, não traçar linha reta — mostrar apenas os markers

### Arquivos alterados

**`src/pages/Index.tsx`**:
- Adicionar estado para rota (`routeGeometry`, `distanciaTotal`, `trechos`, `roteirizadoGroups`)
- Adicionar botão "Roteirizar" na barra de seleção (ao lado de "Fechar Carga")
- Ao clicar, chamar a edge function `roteirizar` com os destinos dos pedidos selecionados
- Abrir um dialog/panel de visualização da rota (novo componente ou inline)
- Passar dados da rota para o `FechamentoLoteDialog` como props

**`src/components/dashboard/RoteirizacaoDialog.tsx`** (novo):
- Dialog com mapa grande + lista de destinos otimizados + km total e por trecho
- Sem campos de transporte — apenas visualização da rota
- Botão "Avançar para Fechar Carga" que abre o FechamentoLoteDialog com a rota já definida

**`src/components/dashboard/FechamentoLoteDialog.tsx`**:
- Remover botão "Roteirizar" e estado de routing
- Aceitar props opcionais `initialRouteGeometry`, `initialDistanciaTotal`, `initialTrechos`, `initialGroupOrder`
- Se receber rota pré-calculada, usar diretamente; senão, mapa mostra apenas markers sem linha

**`src/components/dashboard/RotaMap.tsx`**:
- Quando `routeGeometry` não é fornecida, não traçar polyline nenhuma (remover fallback de linhas retas)
- Manter markers sempre visíveis

### Sem alterações no banco de dados

