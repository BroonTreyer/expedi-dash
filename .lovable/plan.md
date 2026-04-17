
User reporta bugs visuais na aba `/portaria/registro-entrada`. Pela rota, o componente é `src/pages/RegistroEntrada.tsx`. Já tenho o código.

## Diagnóstico

Olhando `RegistroEntrada.tsx`:
1. **`max-w-5xl mx-auto` direto na raiz, sem padding** — o conteúdo cola na sidebar/borda no desktop e fica colado nas laterais no mobile. As outras páginas usam wrapper `p-4 md:p-6` ou `container`.
2. **Sem padding vertical/horizontal** na raiz — quebra alinhamento com o header.
3. Cards "Frota Própria" / "Terceirizado" usam `grid-cols-1 sm:grid-cols-2` mas sem `max-w` interno — ficam gigantes no desktop quando combinados com `max-w-5xl`, parecem desproporcionais.
4. `SolicitacoesPendentesPanel` colado nos cards (gap ok, mas sem separador visual claro).
5. Header (`flex items-start gap-3`) — descrição quebra em viewport médio sem max-width.

## Plano

Editar **`src/pages/RegistroEntrada.tsx`**:
- Trocar wrapper raiz por padrão das outras páginas: `<div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">`.
- Header: dar `max-w-2xl` na descrição para não esticar demais.
- Grid dos cards: manter `grid-cols-1 sm:grid-cols-2 gap-4` (ok), mas reduzir padding interno do card de `p-6` para algo mais equilibrado e adicionar altura mínima consistente.
- Adicionar separador/título antes do `SolicitacoesPendentesPanel`: `<div className="pt-2"><h2 className="text-lg font-semibold mb-2">Solicitações pendentes</h2>` (ou deixar o painel cuidar — verificar se ele já tem título; vou manter simples sem duplicar).

## Sem mudanças em
- `RegistroEntradaDialog`, `SolicitacoesPendentesPanel`, hooks, banco, rotas.

## Arquivos
- ✏️ `src/pages/RegistroEntrada.tsx` (apenas wrapper/spacing/responsividade)
