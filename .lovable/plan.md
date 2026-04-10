

# Corrigir dois bugs no fluxo Veículos Esperados → Dialog

## Problemas encontrados

**Bug 1 — Estado `prefillEtapa` não é resetado**: Quando o usuário clica "Registrar Saída p/ Rota" nos Veículos Esperados, a função `openRegistroFromVeiculoEsperado` faz `setPrefill(null)` mas **não** faz `setPrefillEtapa(null)`. Se antes o usuário abriu um Retorno ou Lacre do pátio, o `prefillEtapa` fica com valor antigo ("retorno" ou "lacre"), fazendo o dialog abrir com título e campos errados.

**Bug 2 — Matriz de campos errada para 1ª saída**: Em `portaria-fields-config.ts`, `getMatrix("saida")` retorna `VISIBILITY_SAIDA` (campos de lacre). Mas a 1ª saída p/ rota usa `tipo = "saida"` e deveria usar a matriz `VISIBILITY` (campos normais: placa, motorista, km_inicial, foto_placa, etc.).

## Correções

### `src/pages/Portaria.tsx`
- Na função `openRegistroFromVeiculoEsperado`, adicionar `setPrefillEtapa(null)` para limpar estado residual

### `src/lib/portaria-fields-config.ts`
- Em `getMatrix()`, mudar a lógica: `"saida"` → retorna `VISIBILITY` (matriz normal), apenas `"lacre"` → retorna `VISIBILITY_SAIDA`

Isso garante que:
- 1ª saída p/ rota (tipo="saida") → mostra campos normais (placa, motorista, km_inicial, foto_placa, rota)
- Retorno (tipo="retorno") → mostra foto painel + km final
- Lacre (tipo="lacre") → mostra foto lacre + nº lacre + conferente

## Arquivos afetados
- `src/pages/Portaria.tsx` (1 linha)
- `src/lib/portaria-fields-config.ts` (1 linha na função `getMatrix`)

