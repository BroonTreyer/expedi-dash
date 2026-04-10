

# Corrigir labels e fluxo de Carga Própria (todos os pontos pendentes)

## Problemas encontrados

1. **Veículos Esperados**: botão diz "Registrar Entrada" — deveria ser **"Registrar Saída p/ Rota"** para carga própria
2. **Callback do Esperados**: `openRegistroFromVeiculoEsperado` envia `tipo: "entrada"` mesmo para carga própria — precisa ser `"saida"`
3. **Pátio**: registros antigos sem `etapa_carga_propria` mostram "Saída c/ KM" em vez de entrar no fluxo correto
4. **Dialog**: seletor de tipo ainda mostra "Entrada/Saída" genérico — para Carga Própria deveria mostrar só "Saída p/ Rota"

## Mudanças

### `src/components/portaria/VeiculosEsperadosPanel.tsx`
- Receber prop `grupo` do veículo para decidir o label do botão
- Se o veículo é carga própria (grupo não é FROTAS/INTERIOR/TERCEIRIZADO): botão → **"Registrar Saída"**
- Se é terceirizado: manter **"Registrar Entrada"**

### `src/pages/Portaria.tsx`
- Em `openRegistroFromVeiculoEsperado`: quando categoria for `carga_propria`, setar `tipo: "saida"` em vez de `"entrada"`

### `src/components/portaria/RegistroMovimentoDialog.tsx`
- No step "categoria", esconder os botões "Entrada/Saída" quando já se sabe que carga_propria sempre será saída. Alternativa: mostrar botão único "Saída p/ Rota" para carga_propria
- Quando `prefillFromPlanilha` com categoria `carga_propria`, forçar `tipo = "saida"` no useEffect de reset

### `src/components/portaria/PatioAtualTab.tsx`
- Tratar registros antigos de carga_propria sem `etapa_carga_propria` como se fossem `em_rota` (fallback), mostrando botão "Registrar Retorno" em vez de "Saída c/ KM"

## Resumo de labels

| Local | Antes | Depois |
|-------|-------|--------|
| Esperados (carga própria) | "Registrar Entrada" | "Registrar Saída" |
| Esperados (terceirizado) | "Registrar Entrada" | Mantém |
| Seletor tipo (carga própria) | "Entrada" / "Saída" | Botão único "Saída p/ Rota" |
| Pátio (sem etapa) | "Saída c/ KM" | "Registrar Retorno" |

## Arquivos afetados
- `src/components/portaria/VeiculosEsperadosPanel.tsx`
- `src/pages/Portaria.tsx`
- `src/components/portaria/RegistroMovimentoDialog.tsx`
- `src/components/portaria/PatioAtualTab.tsx`

