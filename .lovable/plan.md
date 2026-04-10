

# Corrigir label do botão em Veículos Esperados

## Problema
O botão em Veículos Esperados diz "Registrar Saída" para carga própria, mas deveria dizer **"Registrar Saída p/ Rota"** para deixar claro que é a 1ª etapa do fluxo. As etapas seguintes (Retorno e Lacre) já estão corretas no Pátio.

## Resumo do fluxo correto

| Onde | Etapa | Botão |
|------|-------|-------|
| Veículos Esperados | 1ª etapa | **Registrar Saída p/ Rota** |
| Pátio (em_rota) | 2ª etapa | Registrar Retorno ✅ (já correto) |
| Pátio (retornou) | 3ª etapa | Saída c/ Lacre ✅ (já correto) |

## Mudança

### `src/components/portaria/VeiculosEsperadosPanel.tsx`
- Trocar o label `"Registrar Saída"` → **`"Registrar Saída p/ Rota"`** para veículos com `grupo === "PRÓPRIA"`
- Dois locais: botão mobile (linha ~167) e botão desktop (linha ~220)

Apenas 1 arquivo, 2 linhas de texto alteradas.

