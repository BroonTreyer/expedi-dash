## Problema

No card do Pátio em `/portaria/carga-propria`, o veículo OND0B48 (PEDRO) aparece com:
- Badge amber **"Aguardando Liberação"** ✓ (correto)
- Badge yellow **"Retornou"** ✗ (errado — confunde o usuário)
- Botão **"Liberar Entrada no Pátio"** ✓ (correto)

## Causa raiz

No banco, o registro está com `etapa_carga_propria = "aguardando_liberacao"` e `horario_entrada = NULL`. Isso é o estado correto para um veículo registrado via **Esperados → Registrar Chegada** (cria a chegada, mas a entrada física no pátio só é confirmada quando a portaria clica em "Liberar Entrada").

O bug está em `PatioAtualTab.tsx` (linhas 300-303 e 483-487) onde o badge da etapa usa um ternário com **fallback para "Retornou"** em qualquer valor diferente de `chegou` ou `em_rota`:

```tsx
{m.etapa_carga_propria === "chegou" ? "Chegou" 
  : m.etapa_carga_propria === "em_rota" ? "Em Rota" 
  : "Retornou"}  // pega aguardando_liberacao por engano
```

Por isso `aguardando_liberacao` (e `finalizado`) acabam rotulados como "Retornou".

## Por que pede "Liberar Entrada" se já registrei em Esperados?

Esse é o fluxo desenhado (correto):
1. Em **Esperados** → "Registrar Chegada" → cria movimento com `horario_chegada` mas SEM `horario_entrada`. Aparece no Pátio em estado **amber "Aguardando Liberação"**.
2. Em **Pátio** → portaria clica em **"Liberar Entrada no Pátio"** → preenche `horario_entrada` e marca `etapa = chegou`. Vira card laranja "Chegou", liberado para Saída p/ Rota.

Esse passo intermediário existe porque "Registrar Chegada" no Esperados é só pré-cadastro/triagem; a entrada física só é confirmada na portaria. Foi a mecânica acordada no fix anterior.

## Correção

Em `src/components/portaria/PatioAtualTab.tsx`, ajustar a renderização do badge de etapa em **dois lugares** (mobile linha ~300 e desktop linha ~485):

1. **Não renderizar o badge da etapa** quando `etapa_carga_propria === "aguardando_liberacao"` — o badge amber "Aguardando Liberação" já cobre esse estado, evitando duplicidade visual.
2. **Substituir o ternário por mapeamento explícito** com fallback seguro:
   - `chegou` → "Chegou" (laranja)
   - `em_rota` → "Em Rota" (azul outline)
   - `retornou` → "Retornou" (amarelo)
   - qualquer outro → não renderizar badge (`null`)

Trocar a estrutura para algo como:
```tsx
{m.categoria === "carga_propria" && 
 m.etapa_carga_propria && 
 m.etapa_carga_propria !== "aguardando_liberacao" && 
 m.etapa_carga_propria !== "finalizado" && (
  <Badge ...>{labelMap[m.etapa_carga_propria]}</Badge>
)}
```

## Resultado

O card vai mostrar somente o badge "Aguardando Liberação" (amber) + botão "Liberar Entrada no Pátio". Quando portaria liberar, o card passa para badge "Chegou" (laranja) + botão "Saída p/ Rota". Sem mais "Retornou" fantasma.

## Arquivos alterados
- `src/components/portaria/PatioAtualTab.tsx` (renderização do badge em mobile e desktop)
