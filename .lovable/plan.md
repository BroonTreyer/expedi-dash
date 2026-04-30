# Remover cards "Peso Carregado" e "Veículos"

## Objetivo
Tirar dois cards do KPI do Painel de Expedição que estavam causando confusão (somavam itens já consolidados, invisíveis na tabela).

## Alteração

**Arquivo:** `src/components/dashboard/KpiCards.tsx`

- Remover o card **"Peso Carregado"** (linha 59)
- Remover o card **"Veículos"** (linha 60)
- Remover os cálculos `pesoCarregado`, `pesoCarregando` e `totalVeiculos` que ficarão sem uso
- Manter "Clientes", "Rupturas" e "Peso Total" (suas dependências de cálculo continuam necessárias para `pesoFaltante`)
- Ajustar o grid para acomodar 3 cards confortavelmente (de `xl:grid-cols-6` → `xl:grid-cols-3`)

## O que NÃO vou mudar
- Os mesmos KPIs em outros painéis (Analytics, Expedição, Portaria) — sua solicitação foi específica para o "Painel" (rota `/`).
- Lógica de filtro / dados subjacentes.

Posso aplicar?
