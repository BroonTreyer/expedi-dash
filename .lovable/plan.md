

# Adicionar etapa "Chegada" para Carga Própria (4 etapas)

## Fluxo atualizado

```text
Veículos Esperados          Pátio
┌──────────────────┐   ┌──────────────────────────────────┐
│ Registrar Chegada│──▶│ 🟠 Chegou → "Saída p/ Rota"     │
│ (só horário)     │   │ 🔵 Em Rota → "Registrar Retorno" │
└──────────────────┘   │ 🟡 Retornou → "Saída c/ Lacre"  │
                       └──────────────────────────────────┘
```

| Etapa | Onde | Ação | Campos |
|-------|------|------|--------|
| 1. Chegada | Esperados | Clique direto (sem dialog) | Só horário + dados da planilha |
| 2. Saída p/ Rota | Pátio | Dialog com campos | KM inicial, foto placa, motorista |
| 3. Retorno | Pátio | Dialog | KM final, foto painel |
| 4. Lacre | Pátio | Dialog | Foto lacre, nº lacre, conferente |

## Mudanças técnicas

### 1. `src/components/portaria/VeiculosEsperadosPanel.tsx`
- Botão para PRÓPRIA: label volta a **"Registrar Chegada"**

### 2. `src/pages/Portaria.tsx`
- `openRegistroFromVeiculoEsperado` para carga própria: em vez de abrir dialog, faz INSERT direto na tabela `movimentacoes_portaria` com:
  - `tipo_movimento = "saida"`, `categoria = "carga_propria"`, `etapa_carga_propria = "chegou"`
  - `data_hora = now()`, placa/motorista/rota/peso/qtd_entregas do veículo esperado
  - Marca o veículo como conferido automaticamente
- Mostrar toast de confirmação

### 3. `src/components/portaria/PatioAtualTab.tsx`
- Incluir `etapa_carga_propria === "chegou"` no filtro de pátio (já inclui em_rota e retornou)
- Adicionar badge **🟠 Chegou** para a nova etapa
- Botão de ação: **"Registrar Saída p/ Rota"** → abre dialog com `prefillEtapa = "saida_rota"`

### 4. `src/components/portaria/RegistroMovimentoDialog.tsx`
- Adicionar tratamento para `prefillEtapa = "saida_rota"`:
  - Mostra info do veículo (placa, motorista, rota)
  - Campos: KM inicial, foto da placa (os campos normais da 1ª saída)
  - No save: UPDATE o registro existente com `etapa_carga_propria = "em_rota"`, `horario_real_saida`, `km_inicial`, etc.

### 5. `src/lib/portaria-fields-config.ts`
- Adicionar tipo `"saida_rota"` que usa a mesma matriz de visibilidade que `"saida"` (campos normais)

### 6. `src/pages/Portaria.tsx` (contagem pátio)
- Ajustar filtro de contagem para incluir `etapa_carga_propria === "chegou"`

**Arquivos afetados:** 5 arquivos

