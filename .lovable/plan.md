

# Corrigir nomes/labels do fluxo de Carga Própria na Portaria

## Problema
Os botões e labels ainda mostram "Entrada" para Carga Própria, o que não faz sentido no fluxo real. O motorista já está dentro da empresa — o primeiro contato com a portaria é quando ele **sai** para a rota.

## Mudanças

### `src/components/portaria/RegistroMovimentoDialog.tsx`

1. Quando categoria for `carga_propria`, trocar o botão "Entrada" por **"Saída p/ Rota"** e esconder o botão "Saída" (não se aplica nessa tela inicial)
2. Remover a mensagem confusa "Para Carga Própria, 'Entrada' registra a 1ª saída para rota"
3. Quando carga_propria é selecionada no step "categoria", pular direto para o form com `tipo = "saida"` e `etapa_carga_propria = "em_rota"` (já funciona assim internamente, mas os labels precisam refletir isso)

Nomes dos botões no seletor de tipo para **Carga Própria**:
- Botão único: **"Saída p/ Rota"** (em vez de Entrada/Saída)

Títulos dos diálogos:
- 1ª etapa (nova): "Saída para Rota" (já está ok via `getDialogTitle`)
- Retorno: "Registrar Retorno" (ok)
- Lacre: "Saída Final — Lacre" (ok)

### `src/components/portaria/PatioAtualTab.tsx`

1. No pátio (desktop), a coluna "Entrada" → renomear para **"Horário"** (genérico, pois carga própria não tem "entrada")
2. Texto vazio no pátio "Registre uma entrada para começar" → **"Registre um movimento para começar"**

### `src/pages/Portaria.tsx`

1. Nas tabs do pátio, verificar se algum label menciona "entrada" de forma genérica que precise ajuste

## Resumo das trocas de labels

| Onde | Antes | Depois |
|------|-------|--------|
| Seletor tipo (carga_propria) | "Entrada" / "Saída" | Botão único "Saída p/ Rota" |
| Mensagem explicativa | "Para Carga Própria, 'Entrada' registra a 1ª saída" | Removida |
| Botão salvar (1ª etapa) | "Registrar Saída p/ Rota" | Mantém (já correto) |
| Coluna pátio | "Entrada" | "Horário" |
| Pátio vazio | "Registre uma entrada para começar" | "Registre um movimento para começar" |

## Arquivos afetados
- `src/components/portaria/RegistroMovimentoDialog.tsx`
- `src/components/portaria/PatioAtualTab.tsx`

