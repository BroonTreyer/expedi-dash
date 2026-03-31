

# Linkar Carga Fechada com Veículo Esperado ou no Pátio

## Problema

Ao fechar uma carga no `FechamentoLoteDialog`, o usuário preenche placa, motorista e transportadora manualmente. Ele quer poder selecionar um veículo que já está na lista de "Esperados" ou "No Pátio" para preencher automaticamente esses campos.

## Solução

Adicionar um seletor opcional no topo da seção "Dados de Transporte" do `FechamentoLoteDialog` que lista veículos esperados e veículos no pátio. Ao selecionar um, preenche automaticamente placa, motorista, transportadora e tipo de caminhão.

### Mudanças

**1. `src/components/dashboard/FechamentoLoteDialog.tsx`**

- Importar `useVeiculosEsperados` e `useMovimentacoesPortaria` (somente leitura)
- Criar lista combinada de veículos disponíveis:
  - **Esperados**: veículos da tabela `veiculos_esperados` para a data do carregamento (não conferidos)
  - **No Pátio**: entradas de `movimentacoes_portaria` sem saída vinculada (terceirizados e carga_propria)
- Adicionar um `<Select>` com label "Vincular a veículo" antes dos campos de transporte
  - Opções: `"manual"` (padrão) + lista de veículos (`[Esperado] PLACA - Motorista` / `[Pátio] PLACA - Motorista`)
- Ao selecionar um veículo:
  - Preencher `placa`, `motorista`, `transportadora`, `tipoCaminhao` automaticamente com os dados do veículo
  - Para esperados: usar `placa`, `motorista`, `transportadora`, `tipo_veiculo`
  - Para pátio: usar `placa`, `motorista`, `empresa` (transportadora), `tipo_caminhao`
- Campos continuam editáveis após preenchimento automático

**2. `src/pages/Index.tsx`**

- Sem mudanças estruturais necessárias. O `FechamentoLoteDialog` buscará os dados internamente via hooks.

### Fluxo

```text
┌─────────────────────────────────────┐
│ Fechar Carga                        │
├─────────────────────────────────────┤
│ [Resumo pedidos / mapa]             │
│                                     │
│ ── Dados de Transporte ──           │
│ Vincular a veículo: [Selecione...▾] │
│   ├ Preencher manualmente           │
│   ├ [Esperado] ABC1D23 - João       │
│   ├ [Pátio] XYZ9K87 - Carlos        │
│                                     │
│ Nome da Carga: [________]           │
│ Tipo Caminhão: [________]  ← auto   │
│ Placa: [________]          ← auto   │
│ Motorista: [________]      ← auto   │
│ Transportadora: [________] ← auto   │
└─────────────────────────────────────┘
```

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/FechamentoLoteDialog.tsx` | Adicionar Select para vincular veículo esperado/pátio, auto-preencher campos |

